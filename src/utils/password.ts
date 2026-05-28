import { supabase } from '@/lib/supabase'
import { validatePassword } from '@/utils/security/validate'

export async function fetchMustChangePassword(
  supplierId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('must_change_password')
    .eq('id', supplierId)
    .maybeSingle()

  if (error) throw error
  return data?.must_change_password === true
}

export async function setNewPassword(
  supplierId: string,
  newPassword: string
): Promise<void> {
  const passwordError = validatePassword(newPassword)
  if (passwordError) throw new Error(passwordError)

  const { error: authError } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (authError) throw authError

  const { error } = await supabase
    .from('suppliers')
    .update({ must_change_password: false })
    .eq('id', supplierId)

  if (error) throw error
}
