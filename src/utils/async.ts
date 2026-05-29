const DEFAULT_TIMEOUT_MESSAGE =
  'A operação demorou demais. Verifique sua conexão e tente novamente.'

/** Rejeita se a promise não resolver dentro de `ms` milissegundos. */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message = DEFAULT_TIMEOUT_MESSAGE
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    Promise.resolve(promise)
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
