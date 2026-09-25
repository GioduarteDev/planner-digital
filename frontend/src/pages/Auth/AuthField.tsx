import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useState, type ComponentPropsWithoutRef } from 'react'


type AuthFieldProps = ComponentPropsWithoutRef<'input'> & {
  id: string
  label: string
  icon: 'email' | 'password' | 'name'
  error?: string
}


const icons = {
  email: Mail,
  password: LockKeyhole,
  name: UserRound,
}


function AuthField({ id, label, icon, error, type = 'text', ...inputProps }: AuthFieldProps) {
  const [visible, setVisible] = useState(false)
  const Icon = icons[icon]
  const isPassword = type === 'password'
  const errorId = `${id}-error`

  return (
    <div className={`auth-field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <Icon aria-hidden="true" />
        <input
          {...inputProps}
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        {isPassword && <button
          type="button"
          className="auth-password-toggle"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          onClick={() => setVisible(value => !value)}
        >{visible ? <EyeOff /> : <Eye />}</button>}
      </div>
      {error && <span className="auth-field-error" id={errorId}>{error}</span>}
    </div>
  )
}


export default AuthField
