/** Simula latência de rede nos mocks, só para os estados de loading serem reais. */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
