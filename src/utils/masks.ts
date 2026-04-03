/**
 * Utilitários de formatação e máscara para campos de formulário.
 * Todas as funções recebem o valor bruto e retornam o valor formatado.
 */

/** Remove tudo que não é dígito */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** CPF: 000.000.000-00 */
export function maskCPF(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

/** CNPJ: 00.000.000/0000-00 */
export function maskCNPJ(value: string): string {
  const digits = onlyDigits(value).slice(0, 14)
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/** Telefone: (00) 0 0000-0000  ou  (00) 0000-0000 */
export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 10) {
    // Fixo: (00) 0000-0000
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  // Celular: (00) 0 0000-0000
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{1})(\d{4})(\d{1,4})$/, '$1 $2-$3')
}

/** CEP: 00000-000 */
export function maskCEP(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2')
}

/** UF: apenas 2 letras maiúsculas */
export function maskUF(value: string): string {
  return value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2)
}

/** PIN: apenas 4-6 dígitos */
export function maskPIN(value: string): string {
  return onlyDigits(value).slice(0, 6)
}

/** Valida CPF (formato completo: 14 chars) */
export function isValidCPF(value: string): boolean {
  return onlyDigits(value).length === 11
}

/** Valida CNPJ (formato completo: 18 chars) */
export function isValidCNPJ(value: string): boolean {
  return onlyDigits(value).length === 14
}

/** Valida telefone (10 ou 11 dígitos) */
export function isValidPhone(value: string): boolean {
  const len = onlyDigits(value).length
  return len === 10 || len === 11
}

/** Valida CEP (8 dígitos) */
export function isValidCEP(value: string): boolean {
  return onlyDigits(value).length === 8
}
