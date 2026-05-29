<template>
  <section class="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 shadow-sm">
    <div>
      <h2 class="font-bold text-zinc-900">
        Importar vários produtos
      </h2>
      <p class="text-sm text-zinc-600 mt-1">
        Use uma planilha do Excel ou do Google Planilhas. Fotos não entram na importação — adicione depois, produto a produto.
      </p>
    </div>

    <details class="text-sm text-zinc-600 space-y-2">
      <summary class="font-semibold text-zinc-800 cursor-pointer select-none">
        Como preparar a planilha
      </summary>
      <ul class="list-disc pl-5 space-y-1 pt-2">
        <li>
          <strong>Excel:</strong> Arquivo → Salvar como → CSV (separado por vírgulas).
        </li>
        <li>
          <strong>Google Planilhas:</strong> Arquivo → Fazer download → Valores separados por vírgula (.csv).
        </li>
        <li>
          Também aceita <strong>.xlsx</strong> direto, sem converter.
        </li>
        <li>
          Colunas: <code class="text-xs bg-zinc-100 px-1 rounded">codigo</code>,
          <code class="text-xs bg-zinc-100 px-1 rounded">descricao</code>,
          <code class="text-xs bg-zinc-100 px-1 rounded">estoque</code>,
          <code class="text-xs bg-zinc-100 px-1 rounded">preco</code>
          (a primeira linha pode ser o cabeçalho).
        </li>
      </ul>
      <p class="text-xs text-zinc-500 pt-1">
        Não usamos login do Google aqui — exportar CSV ou enviar o Excel é o jeito mais simples e seguro.
      </p>
    </details>

    <div class="flex flex-col sm:flex-row gap-2">
      <button
        type="button"
        class="min-h-11 px-4 text-sm font-semibold border-2 border-zinc-300 rounded-xl bg-white active:bg-zinc-50"
        @click="downloadImportTemplate"
      >
        Baixar modelo (.csv)
      </button>
      <label
        class="flex-1 min-h-11 flex items-center justify-center px-4 text-sm font-semibold text-white bg-zinc-800 rounded-xl active:bg-zinc-600 cursor-pointer"
        :class="{ 'opacity-50 pointer-events-none': disabled || importing }"
      >
        Escolher planilha
        <input
          ref="fileInput"
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          class="sr-only"
          :disabled="disabled || importing"
          @change="onFileSelected"
        >
      </label>
    </div>

    <div class="space-y-2">
      <label class="text-sm font-medium text-zinc-700">
        Ou cole da planilha (Ctrl+C no Google Planilhas / Excel)
      </label>
      <textarea
        v-model="pasteText"
        rows="4"
        placeholder="Cole aqui as linhas copiadas (com cabeçalho ou só os dados)…"
        class="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-zinc-900"
        :disabled="disabled || importing"
      />
      <button
        type="button"
        class="min-h-10 px-4 text-sm font-semibold border-2 border-zinc-300 rounded-xl bg-white active:bg-zinc-50 disabled:opacity-50"
        :disabled="disabled || importing || !pasteText.trim()"
        @click="onPastePreview"
      >
        Pré-visualizar colagem
      </button>
    </div>

    <p v-if="fileName" class="text-xs text-zinc-500">
      Arquivo: {{ fileName }}
    </p>

    <p v-if="parseError" class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
      {{ parseError }}
    </p>

    <div v-if="preview" class="space-y-3">
      <p class="text-sm text-zinc-700">
        <strong>{{ preview.valid.length }}</strong> produto(s) prontos para importar
        <span v-if="preview.errors.length">
          · <strong class="text-red-700">{{ preview.errors.length }}</strong> linha(s) com erro
        </span>
      </p>

      <div
        v-if="preview.errors.length"
        class="max-h-40 overflow-y-auto text-xs border border-red-100 rounded-lg bg-red-50/50"
      >
        <p
          v-for="err in preview.errors.slice(0, 20)"
          :key="err.lineNumber"
          class="px-3 py-1.5 border-b border-red-100 last:border-0 text-red-800"
        >
          Linha {{ err.lineNumber }}: {{ err.ok === false ? err.error : '' }}
        </p>
        <p v-if="preview.errors.length > 20" class="px-3 py-2 text-red-700">
          … e mais {{ preview.errors.length - 20 }} erro(s).
        </p>
      </div>

      <div
        v-if="preview.valid.length"
        class="max-h-48 overflow-auto border border-zinc-200 rounded-lg text-xs"
      >
        <table class="w-full">
          <thead class="bg-zinc-100 sticky top-0">
            <tr>
              <th class="text-left px-2 py-1.5 font-semibold">Código</th>
              <th class="text-left px-2 py-1.5 font-semibold">Descrição</th>
              <th class="text-right px-2 py-1.5 font-semibold">Est.</th>
              <th class="text-right px-2 py-1.5 font-semibold">Preço</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, idx) in preview.valid.slice(0, 15)"
              :key="idx"
              class="border-t border-zinc-100"
            >
              <td class="px-2 py-1">{{ row.code }}</td>
              <td class="px-2 py-1 truncate max-w-[10rem]">{{ row.description }}</td>
              <td class="px-2 py-1 text-right">{{ row.stock }}</td>
              <td class="px-2 py-1 text-right">{{ row.price }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="preview.valid.length > 15" class="px-2 py-1 text-zinc-500">
          … e mais {{ preview.valid.length - 15 }} produto(s).
        </p>
      </div>

      <button
        type="button"
        class="w-full min-h-12 py-3 text-base font-bold text-white bg-emerald-700 rounded-xl active:bg-emerald-800 disabled:opacity-50"
        :disabled="disabled || importing || !preview.valid.length"
        @click="runImport"
      >
        {{ importing ? `Importando… (${importProgress})` : `Importar ${preview.valid.length} produto(s)` }}
      </button>
    </div>

    <p v-if="importMessage" class="text-sm rounded-lg px-3 py-2" :class="importMessageClass">
      {{ importMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/utils/async'
import {
  downloadImportTemplate,
  parseDelimitedText,
  parseImportGrid,
  parseSpreadsheetFile,
  type ParseImportResult,
} from '@/utils/productImport'

const props = defineProps<{
  supplierId: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  imported: []
  error: [message: string]
}>()

const DB_TIMEOUT_MS = 60_000
const BATCH_SIZE = 50

const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref('')
const pasteText = ref('')
const parseError = ref('')
const preview = ref<ParseImportResult | null>(null)
const importing = ref(false)
const importProgress = ref('')
const importMessage = ref('')
const importSuccess = ref(false)

const importMessageClass = computed(() =>
  importSuccess.value
    ? 'text-emerald-800 bg-emerald-50 border border-emerald-100'
    : 'text-red-600 bg-red-50 border border-red-100'
)

function setPreview(result: ParseImportResult) {
  preview.value = result
  parseError.value = ''
  importMessage.value = ''
  if (!result.valid.length && result.errors.length) {
    parseError.value = 'Nenhuma linha válida. Corrija a planilha e tente de novo.'
  } else if (!result.valid.length) {
    parseError.value = 'Nenhum produto encontrado no arquivo.'
  }
}

function onPastePreview() {
  try {
    const grid = parseDelimitedText(pasteText.value, '\t')
    if (grid.length <= 1 && pasteText.value.includes(',')) {
      setPreview(parseImportGrid(parseDelimitedText(pasteText.value)))
      return
    }
    setPreview(parseImportGrid(grid))
  } catch (e: unknown) {
    parseError.value = e instanceof Error ? e.message : 'Erro ao ler colagem.'
    preview.value = null
  }
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  fileName.value = file.name
  parseError.value = ''
  importMessage.value = ''
  preview.value = null

  try {
    const grid = await parseSpreadsheetFile(file)
    setPreview(parseImportGrid(grid))
  } catch (err: unknown) {
    parseError.value = err instanceof Error ? err.message : 'Erro ao ler o arquivo.'
  }
}

async function runImport() {
  if (!preview.value?.valid.length || importing.value || props.disabled) return

  importing.value = true
  importMessage.value = ''
  importSuccess.value = false
  let inserted = 0

  try {
    const rows = preview.value.valid.map((row) => ({
      supplier_id: props.supplierId,
      ...row,
      image_urls: [] as string[],
    }))

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      importProgress.value = `${Math.min(i + batch.length, rows.length)} / ${rows.length}`
      const { error } = await withTimeout(
        supabase.from('products').insert(batch),
        DB_TIMEOUT_MS,
        'A importação demorou demais. Verifique sua conexão.'
      )
      if (error) throw new Error(error.message)
      inserted += batch.length
    }

    importSuccess.value = true
    importMessage.value = `${inserted} produto(s) importado(s) com sucesso.`
    preview.value = null
    pasteText.value = ''
    fileName.value = ''
    emit('imported')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro na importação.'
    importMessage.value =
      inserted > 0
        ? `${inserted} produto(s) foram salvos antes do erro: ${msg}`
        : msg
    emit('error', importMessage.value)
  } finally {
    importing.value = false
    importProgress.value = ''
  }
}
</script>
