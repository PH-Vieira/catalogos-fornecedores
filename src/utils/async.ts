const DEFAULT_TIMEOUT_MESSAGE =
  'A operação demorou demais. Verifique sua conexão e tente novamente.'

/**
 * Executa `run` e rejeita se não resolver dentro de `ms` milissegundos.
 * Use função () => promise para garantir que a requisição só começa ao chamar.
 */
export function withTimeout<T>(
  run: () => PromiseLike<T>,
  ms: number,
  message = DEFAULT_TIMEOUT_MESSAGE
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    Promise.resolve()
      .then(run)
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}
