<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { RouterLink } from 'vue-router'
import { useSupplier } from '@/composables/useSupplier'
import { useAdminAuth } from '@/composables/useAdminAuth'
import AdminLoginForm from '@/components/AdminLoginForm.vue'
import AdminPasskeySetup from '@/components/AdminPasskeySetup.vue'
import ForcePasswordChange from '@/components/ForcePasswordChange.vue'
import ProductImagesUploadField from '@/components/ProductImagesUploadField.vue'
import { validateProductInput, isValidUuid } from '@/utils/security/validate'
import { validateImageFile, safeImageExtension } from '@/utils/security/upload'
import { formatPrice } from '@/utils/format'
import { normalizeProduct, productImageUrls } from '@/utils/productImages'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'

const { supplier, loading: supplierLoading, error: supplierError, load } =
  useSupplier()

const {
  session,
  mustChangePassword,
  authReady,
  isOwner,
  setSession,
  syncPasswordRequirement,
  onPasswordChanged,
  signOut,
} = useAdminAuth(() => supplier.value)

const adminProducts = ref<Product[]>([])
const loading = ref(false)
const message = ref('')

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
  editingImageUrls.value = [...productImageUrls(p)]
  imageFiles.value = []
  imagesUploadRef.value?.clear()
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

async function uploadNewImages(supplierId: string): Promise<string[]> {
  const urls: string[] = []
  for (const file of imageFiles.value) {
    urls.push(await uploadImageFile(supplierId, file))
  }
  return urls
}

async function saveProduct() {
  if (!supplier.value || !isOwner.value) return
  loading.value = true
  message.value = ''
  try {
    const validated = validateProductInput(form.value)
    if (!validated.ok) {
      message.value = validated.error
      return
    }

    const uploadedUrls = await uploadNewImages(supplier.value.id)
    const image_urls = [...editingImageUrls.value, ...uploadedUrls]

    const payload: Record<string, unknown> = {
      supplier_id: supplier.value.id,
      ...validated.data,
      image_urls,
    }

    let productId = editingId.value

    if (productId) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', productId)
      if (error) throw formatDbError(error, 'salvar produto')
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select('id')
        .single()
      if (error) throw formatDbError(error, 'cadastrar produto')
      productId = data.id
    }

    resetForm()
    await loadAdminProducts()
  } catch (e: unknown) {
    message.value = e instanceof Error ? e.message : 'Erro ao salvar'
  } finally {
    loading.value = false
  }
}

async function deleteProduct(id: string) {
  if (!isValidUuid(id)) {
    message.value = 'Produto inválido.'
    return
  }
  if (!confirm('Excluir este produto?')) return
  loading.value = true
  message.value = ''
  const { error } = await supabase.from('products').delete().eq('id', id)
  loading.value = false
  if (error) message.value = error.message
  else await loadAdminProducts()
}

async function onLoginSuccess(newSession: Session) {
  message.value = ''
  setSession(newSession)
  if (!isOwner.value) {
    await signOut()
    message.value = 'Esta conta não administra esta loja.'
    return
  }
  await syncPasswordRequirement()
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

const productCount = computed(() => adminProducts.value.length)
</script>

<template>
  <div class="min-h-screen min-h-[100dvh] bg-zinc-100">
    <header class="bg-white border-b border-zinc-300 px-3 sm:px-4 py-3 sticky top-0 z-10 pt-safe shadow-sm">
      <div class="max-w-2xl mx-auto flex items-start justify-between gap-2">
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
          <AdminPasskeySetup />

          <form
            class="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 shadow-sm"
            @submit.prevent="saveProduct"
          >
            <h2 class="font-bold text-zinc-900">
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

          <div class="flex justify-end">
            <button
              type="button"
              class="text-sm text-zinc-600 underline"
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
                    <p class="text-xs text-zinc-500">
                      Estoque: {{ p.stock }}
                    </p>
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
