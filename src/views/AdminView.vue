<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { RouterLink } from 'vue-router'
import { useSupplier } from '@/composables/useSupplier'
import { useAdminAuth } from '@/composables/useAdminAuth'
import AdminLoginForm from '@/components/AdminLoginForm.vue'
import AdminPasskeySetup from '@/components/AdminPasskeySetup.vue'
import ForcePasswordChange from '@/components/ForcePasswordChange.vue'
import ProductImagesUploadField from '@/components/ProductImagesUploadField.vue'
import AdminProductImport from '@/components/AdminProductImport.vue'
import { validateProductInput, isValidUuid } from '@/utils/security/validate'
import { validateImageFile, safeImageExtension } from '@/utils/security/upload'
import { formatPrice } from '@/utils/format'
import { withTimeout } from '@/utils/async'
import { normalizeProduct, productImageUrls } from '@/utils/productImages'
import { supabase } from '@/lib/supabase'
import { supportsPasskeys } from '@/composables/usePasskeyAuth'
import type { Product } from '@/types'

const { supplier, loading: supplierLoading, error: supplierError, load } =
  useSupplier()

const {
  session,
  mustChangePassword,
  authReady,
  isOwner,
  setSession,
  refreshAuth,
  syncPasswordRequirement,
  onPasswordChanged,
  signOut,
} = useAdminAuth(() => supplier.value)

const adminProducts = ref<Product[]>([])
const loading = ref(false)
const message = ref('')
const showImportPanel = ref(false)
const showPasskeyPanel = ref(false)
const passkeyAvailable = supportsPasskeys()

const editingId = ref<string | null>(null)
const editingImageUrls = ref<string[]>([])
const imageFiles = ref<File[]>([])
const imagesUploadRef = ref<InstanceType<typeof ProductImagesUploadField> | null>(null)

const form = ref({
  code: '',
  description: '',
  stock: 0,
  price: 0,
})

const inputClass =
  'input-touch w-full px-4 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900'

load()

onMounted(() => {
  void refreshAuth()
})

watch(
  () =>
    [authReady.value, isOwner.value, mustChangePassword.value, supplier.value?.id] as const,
  async ([ready, owner, mustChange]) => {
    if (ready && owner && !mustChange && supplier.value) {
      await loadAdminProducts()
    }
  },
  { immediate: true }
)

async function loadAdminProducts() {
  if (!supplier.value) return
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('supplier_id', supplier.value.id)
    .order('created_at', { ascending: false })
  if (error) message.value = error.message
  else adminProducts.value = (data ?? []).map((row) => normalizeProduct(row as Product))
}

function resetForm() {
  editingId.value = null
  editingImageUrls.value = []
  imageFiles.value = []
  imagesUploadRef.value?.clear()
  form.value = { code: '', description: '', stock: 0, price: 0 }
}

function editProduct(p: Product) {
  editingId.value = p.id
  imageFiles.value = []
  imagesUploadRef.value?.clearPendingOnly()
  editingImageUrls.value = [...productImageUrls(p)]
  form.value = {
    code: p.code,
    description: p.description,
    stock: p.stock,
    price: Number(p.price),
  }
  message.value = ''
}

function formatDbError(error: { message: string; code?: string }, action: string): Error {
  if (error.message.includes('row-level security')) {
    return new Error(
      `Sem permissão para ${action}. Confirme que o usuário logado é o dono da loja (user_id em suppliers) e execute a migration fix_products_rls no Supabase.`
    )
  }
  return new Error(error.message)
}

async function uploadImageFile(supplierId: string, file: File): Promise<string> {
  const fileError = validateImageFile(file)
  if (fileError) throw new Error(fileError)
  const ext = safeImageExtension(file)
  const path = `${supplierId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true })
  if (error) throw formatDbError(error, 'enviar foto')
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}

const UPLOAD_TIMEOUT_MS = 120_000
const DB_TIMEOUT_MS = 30_000
const SESSION_TIMEOUT_MS = 10_000
const SAVE_SAFETY_MS = UPLOAD_TIMEOUT_MS + DB_TIMEOUT_MS * 3 + 15_000

let saveRunId = 0
let saveSafetyTimer: ReturnType<typeof setTimeout> | null = null

function clearSaveSafetyTimer() {
  if (saveSafetyTimer !== null) {
    clearTimeout(saveSafetyTimer)
    saveSafetyTimer = null
  }
}

function finishSave(runId: number) {
  if (runId === saveRunId) {
    clearSaveSafetyTimer()
    loading.value = false
  }
}

async function requireSession() {
  const { data, error } = await withTimeout(
    () => supabase.auth.getSession(),
    SESSION_TIMEOUT_MS,
    'Não foi possível verificar o login. Saia e entre novamente.'
  )
  if (error) throw new Error(error.message)
  if (!data.session) {
    throw new Error('Sessão expirada. Saia e entre novamente.')
  }
}

async function uploadNewImages(supplierId: string, files: File[]): Promise<string[]> {
  if (!files.length) return []
  return Promise.all(
    files.map((file) =>
      withTimeout(
        () => uploadImageFile(supplierId, file),
        UPLOAD_TIMEOUT_MS,
        'Envio da foto demorou demais. Verifique sua conexão e tente novamente.'
      )
    )
  )
}

function onProductFormSubmit() {
  if (loading.value) {
    message.value = 'Aguarde o salvamento em andamento ou recarregue a página.'
    return
  }
  void saveProduct()
}

async function saveProduct() {
  if (!supplier.value || !isOwner.value) return

  const validated = validateProductInput(form.value)
  if (!validated.ok) {
    message.value = validated.error
    return
  }

  const runId = ++saveRunId
  loading.value = true
  message.value = ''
  clearSaveSafetyTimer()
  saveSafetyTimer = setTimeout(() => {
    if (runId === saveRunId && loading.value) {
      loading.value = false
      message.value =
        'O salvamento travou. Verifique sua conexão e tente de novo.'
    }
  }, SAVE_SAFETY_MS)

  const filesToUpload = [...imageFiles.value]
  const supplierId = supplier.value.id
  const existingUrls = [...editingImageUrls.value]
  const productId = editingId.value

  try {
    await requireSession()

    const uploadedUrls = await uploadNewImages(supplierId, filesToUpload)
    const image_urls = [...existingUrls, ...uploadedUrls]

    const payload: Record<string, unknown> = {
      supplier_id: supplierId,
      ...validated.data,
      image_urls,
    }

    if (productId) {
      const { error } = await withTimeout(
        () => supabase.from('products').update(payload).eq('id', productId),
        DB_TIMEOUT_MS,
        'Salvar o produto demorou demais. Verifique sua conexão e tente novamente.'
      )
      if (error) throw formatDbError(error, 'salvar produto')
    } else {
      const { error } = await withTimeout(
        () => supabase.from('products').insert(payload).select('id').single(),
        DB_TIMEOUT_MS,
        'Cadastrar o produto demorou demais. Verifique sua conexão e tente novamente.'
      )
      if (error) throw formatDbError(error, 'cadastrar produto')
    }

    await withTimeout(
      () => loadAdminProducts(),
      DB_TIMEOUT_MS,
      'Atualizar a lista demorou demais. O produto pode ter sido salvo — recarregue a página.'
    )
    resetForm()
  } catch (e: unknown) {
    if (runId === saveRunId) {
      message.value = e instanceof Error ? e.message : 'Erro ao salvar'
    }
  } finally {
    finishSave(runId)
  }
}

onBeforeUnmount(() => {
  saveRunId++
  clearSaveSafetyTimer()
  loading.value = false
})

const stockStepBtnClass =
  'min-h-9 px-2 rounded-lg border-2 border-zinc-300 bg-zinc-50 text-xs font-bold text-zinc-800 active:bg-zinc-100 disabled:opacity-40'

async function persistStock(p: Product, next: number) {
  if (loading.value) return
  const clamped = Math.min(999_999, Math.max(0, next))
  if (clamped === p.stock) return

  const prev = p.stock
  p.stock = clamped
  if (editingId.value === p.id) form.value.stock = clamped

  const { error } = await withTimeout(
    () => supabase.from('products').update({ stock: clamped }).eq('id', p.id),
    DB_TIMEOUT_MS
  )
  if (error) {
    p.stock = prev
    if (editingId.value === p.id) form.value.stock = prev
    message.value = error.message
  }
}

function adjustStock(p: Product, delta: number) {
  void persistStock(p, p.stock + delta)
}

function zeroStock(p: Product) {
  void persistStock(p, 0)
}

async function deleteProduct(id: string) {
  if (!isValidUuid(id)) {
    message.value = 'Produto inválido.'
    return
  }
  if (!confirm('Excluir este produto?')) return
  if (loading.value) {
    message.value = 'Aguarde o salvamento em andamento.'
    return
  }

  const runId = ++saveRunId
  loading.value = true
  message.value = ''
  try {
    await requireSession()
    const { error } = await withTimeout(
      () => supabase.from('products').delete().eq('id', id),
      DB_TIMEOUT_MS
    )
    if (error) message.value = error.message
    else await withTimeout(() => loadAdminProducts(), DB_TIMEOUT_MS)
  } catch (e: unknown) {
    if (runId === saveRunId) {
      message.value = e instanceof Error ? e.message : 'Erro ao excluir'
    }
  } finally {
    finishSave(runId)
  }
}

async function onLoginSuccess(newSession: Session) {
  message.value = ''
  setSession(newSession)
  await refreshAuth()
  if (!isOwner.value) {
    await signOut()
    message.value = 'Esta conta não administra esta loja.'
    return
  }
  if (!mustChangePassword.value) await loadAdminProducts()
}

async function handleSignOut() {
  await signOut()
  resetForm()
  message.value = ''
  adminProducts.value = []
}

async function handlePasswordChanged() {
  onPasswordChanged()
  await loadAdminProducts()
}

function toggleImportPanel() {
  showImportPanel.value = !showImportPanel.value
  if (showImportPanel.value) showPasskeyPanel.value = false
}

function togglePasskeyPanel() {
  showPasskeyPanel.value = !showPasskeyPanel.value
  if (showPasskeyPanel.value) showImportPanel.value = false
}

const secondaryBtnClass =
  'min-h-10 px-3 text-sm font-semibold border-2 rounded-xl active:bg-zinc-50'

async function onProductsImported() {
  message.value = ''
  await loadAdminProducts()
  showImportPanel.value = false
}

const productCount = computed(() => adminProducts.value.length)
</script>

<template>
  <div class="min-h-screen min-h-[100dvh] bg-zinc-100">
    <header class="bg-white border-b border-zinc-300 px-3 sm:px-4 py-3 sticky top-0 z-10 pt-safe shadow-sm">
      <div class="max-w-2xl mx-auto flex items-start justify-between gap-2 pt-1.5">
        <div class="min-w-0 flex-1">
          <h1 class="text-lg font-bold text-zinc-900">
            Administração
          </h1>
          <p v-if="supplier && isOwner" class="text-xs text-zinc-500 truncate">
            {{ supplier.name }} · {{ productCount }} produto(s)
          </p>
        </div>
        <RouterLink
          to="/"
          class="shrink-0 min-h-11 flex items-center text-sm font-semibold text-zinc-900 bg-zinc-100 active:bg-zinc-200 px-3 rounded-xl no-underline"
        >
          Ver catálogo
        </RouterLink>
      </div>
    </header>

    <div class="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 pb-safe">
      <p v-if="supplierLoading || !authReady" class="text-zinc-600 text-center py-8">
        Carregando…
      </p>

      <div v-else-if="supplierError" class="text-center py-8">
        <p class="text-red-600">{{ supplierError }}</p>
      </div>

      <template v-else-if="supplier">
        <p
          v-if="message && session"
          class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
        >
          {{ message }}
        </p>

        <!-- Login -->
        <template v-if="!session">
          <div class="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <AdminLoginForm :supplier="supplier" @success="onLoginSuccess" />
          </div>
        </template>

        <template v-else-if="!isOwner">
          <div class="bg-white border border-zinc-200 rounded-xl p-5 text-center space-y-3 shadow-sm">
            <p class="text-zinc-700">
              Esta conta não administra <strong>{{ supplier.name }}</strong>.
            </p>
            <button
              type="button"
              class="px-4 py-2 text-sm font-semibold border-2 border-zinc-900 rounded-lg"
              @click="handleSignOut"
            >
              Sair
            </button>
          </div>
        </template>

        <template v-else-if="mustChangePassword">
          <ForcePasswordChange
            :supplier-id="supplier.id"
            @done="handlePasswordChanged"
          />
          <button
            type="button"
            class="w-full py-2 text-sm font-semibold border-2 border-zinc-900 rounded-lg bg-white"
            @click="handleSignOut"
          >
            Sair
          </button>
        </template>

        <!-- CRUD -->
        <template v-else>
          <form
            class="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 shadow-sm"
            @submit.prevent="onProductFormSubmit"
          >
            <h2 class="text-lg font-bold text-zinc-900">
              {{ editingId ? 'Editar produto' : 'Novo produto' }}
            </h2>

            <div class="space-y-1">
              <label class="text-sm font-medium text-zinc-700">Código</label>
              <input
                v-model="form.code"
                type="text"
                required
                placeholder="Ex: SKU-001"
                maxlength="50"
                :class="inputClass"
              >
            </div>

            <div class="space-y-1">
              <label class="text-sm font-medium text-zinc-700">Descrição</label>
              <textarea
                v-model="form.description"
                required
                rows="3"
                placeholder="Nome e detalhes do produto"
                maxlength="500"
                :class="inputClass + ' resize-none'"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-sm font-medium text-zinc-700">Estoque</label>
                <input
                  v-model.number="form.stock"
                  type="number"
                  min="0"
                  required
                  :class="inputClass"
                >
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-zinc-700">Preço (R$)</label>
                <input
                  v-model.number="form.price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  :class="inputClass"
                >
              </div>
            </div>

            <ProductImagesUploadField
              ref="imagesUploadRef"
              v-model:existing-urls="editingImageUrls"
              v-model:files="imageFiles"
            />

            <div class="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="submit"
                class="flex-1 min-h-12 py-3 text-base font-bold text-white bg-zinc-900 rounded-xl active:bg-zinc-700 disabled:opacity-50"
                :disabled="loading"
              >
                {{ loading ? 'Salvando…' : 'Salvar produto' }}
              </button>
              <button
                v-if="editingId"
                type="button"
                class="min-h-12 px-4 text-base font-semibold border-2 border-zinc-300 rounded-xl bg-white active:bg-zinc-50"
                @click="resetForm"
              >
                Cancelar
              </button>
            </div>
          </form>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              :class="[
                secondaryBtnClass,
                showImportPanel
                  ? 'border-zinc-900 bg-zinc-100 text-zinc-900'
                  : 'border-zinc-300 bg-white text-zinc-700',
              ]"
              @click="toggleImportPanel"
            >
              {{ showImportPanel ? 'Fechar importação' : 'Importar planilha' }}
            </button>
            <button
              v-if="passkeyAvailable"
              type="button"
              :class="[
                secondaryBtnClass,
                showPasskeyPanel
                  ? 'border-zinc-900 bg-zinc-100 text-zinc-900'
                  : 'border-zinc-300 bg-white text-zinc-700',
              ]"
              @click="togglePasskeyPanel"
            >
              {{ showPasskeyPanel ? 'Fechar biometria' : 'Entrada com biometria' }}
            </button>
          </div>

          <AdminProductImport
            v-if="showImportPanel && supplier"
            :supplier-id="supplier.id"
            :disabled="loading"
            @imported="onProductsImported"
            @error="(msg) => (message = msg)"
            @close="showImportPanel = false"
          />

          <AdminPasskeySetup
            v-if="showPasskeyPanel"
            @close="showPasskeyPanel = false"
          />

          <div class="pt-2">
            <button
              type="button"
              class="w-full min-h-11 px-4 text-sm font-semibold text-red-800 bg-white border-2 border-red-200 rounded-xl active:bg-red-50"
              @click="handleSignOut"
            >
              Sair da conta
            </button>
          </div>

          <section v-if="adminProducts.length" class="space-y-2">
            <h3 class="text-sm font-bold text-zinc-700 uppercase tracking-wide">
              Produtos cadastrados
            </h3>
            <ul class="space-y-3">
              <li
                v-for="p in adminProducts"
                :key="p.id"
                class="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm"
              >
                <div class="flex gap-3">
                  <div
                    class="w-16 h-16 shrink-0 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center"
                  >
                    <img
                      v-if="productImageUrls(p)[0]"
                      :src="productImageUrls(p)[0]"
                      :alt="p.description"
                      class="w-full h-full object-contain"
                    >
                    <span v-else class="text-[10px] text-zinc-400">Sem foto</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs text-zinc-500">
                      {{ p.code }}
                    </p>
                    <p class="text-sm font-medium text-zinc-900 line-clamp-2">
                      {{ p.description }}
                    </p>
                    <p class="text-sm font-semibold text-zinc-800 mt-1">
                      {{ formatPrice(Number(p.price)) }}
                    </p>
                    <div class="flex flex-wrap items-center gap-2 mt-2">
                      <span class="text-xs text-zinc-500">Estoque</span>
                      <div class="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          :class="stockStepBtnClass"
                          :disabled="loading || p.stock <= 0"
                          @click="adjustStock(p, -10)"
                        >
                          −10
                        </button>
                        <button
                          type="button"
                          :class="stockStepBtnClass"
                          :disabled="loading || p.stock <= 0"
                          @click="adjustStock(p, -5)"
                        >
                          −5
                        </button>
                        <button
                          type="button"
                          :class="stockStepBtnClass"
                          :disabled="loading || p.stock <= 0"
                          aria-label="Diminuir estoque em 1"
                          @click="adjustStock(p, -1)"
                        >
                          −1
                        </button>
                        <span class="min-w-[2.5rem] text-center text-sm font-bold text-zinc-900 tabular-nums">
                          {{ p.stock }}
                        </span>
                        <button
                          type="button"
                          :class="stockStepBtnClass"
                          :disabled="loading || p.stock >= 999_999"
                          aria-label="Aumentar estoque em 1"
                          @click="adjustStock(p, 1)"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          :class="stockStepBtnClass"
                          :disabled="loading || p.stock >= 999_999"
                          @click="adjustStock(p, 5)"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          :class="stockStepBtnClass"
                          :disabled="loading || p.stock >= 999_994"
                          @click="adjustStock(p, 10)"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          class="min-h-9 px-2 rounded-lg border-2 border-red-200 bg-red-50 text-xs font-bold text-red-800 active:bg-red-100 disabled:opacity-40"
                          :disabled="loading || p.stock === 0"
                          @click="zeroStock(p)"
                        >
                          Zerar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2 mt-3">
                  <button
                    type="button"
                    class="min-h-11 text-sm font-semibold bg-zinc-900 text-white rounded-xl active:bg-zinc-700"
                    @click="editProduct(p)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="min-h-11 text-sm font-semibold text-red-700 border-2 border-red-200 rounded-xl active:bg-red-50"
                    @click="deleteProduct(p.id)"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            </ul>
          </section>

          <p v-else class="text-sm text-zinc-500 text-center py-6 bg-white rounded-xl border border-dashed border-zinc-300">
            Nenhum produto cadastrado. Use o formulário acima para adicionar o primeiro.
          </p>
        </template>
      </template>
    </div>
  </div>
</template>
