import { useState, type FormEvent } from 'react'
import { ArrowRight, Leaf, LoaderCircle } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiRequest, saveAuth } from '../../services/api'
import AuthCarousel from './AuthCarousel'
import AuthField from './AuthField'
import AuthSidebar from './AuthSidebar'
import './AuthPage.css'

type AuthMode = 'login' | 'register'
type UserFromApi = { id: number; email: string; name: string; username: string | null; created_at: string }
type AuthResponse = { user: UserFromApi }
type FieldName = 'name' | 'email' | 'password' | 'confirmPassword'
type FieldErrors = Partial<Record<FieldName | 'form', string>>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const mode: AuthMode = location.pathname === '/register' ? 'register' : 'login'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  function validate() {
    const next: FieldErrors = {}
    const normalizedEmail = email.trim()
    if (mode === 'register' && !name.trim()) next.name = 'Conte como podemos chamar você.'
    if (!normalizedEmail) next.email = 'Digite seu e-mail.'
    else if (!emailPattern.test(normalizedEmail)) next.email = 'Digite um e-mail válido.'
    if (!password) next.password = 'Digite sua senha.'
    else if (mode === 'register' && password.length < 8) next.password = 'Use pelo menos 8 caracteres.'
    if (mode === 'register' && !confirmPassword) next.confirmPassword = 'Digite a senha mais uma vez.'
    else if (mode === 'register' && password !== confirmPassword) next.confirmPassword = 'As senhas não coincidem.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return
    try {
      setIsLoading(true)
      setErrors({})
      const response = await apiRequest<AuthResponse>(mode === 'login' ? '/auth/login' : '/auth/register', {
        method: 'POST',
        body: JSON.stringify(mode === 'login'
          ? { email: email.trim(), password }
          : { name: name.trim(), email: email.trim(), password }),
      })
      saveAuth(response.user)
      navigate('/', { replace: true })
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : mode === 'login' ? 'Não foi possível entrar. Tente novamente.' : 'Não foi possível criar sua conta. Tente novamente.' })
    } finally {
      setIsLoading(false)
    }
  }

  return <main className="auth-page">
    <div className="auth-editorial-shell">
      <AuthSidebar />
      <AuthCarousel />
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-panel-inner">
          <div className="auth-botanical" aria-hidden="true"><Leaf /><span /><Leaf /></div>
          <span className="auth-kicker">SEU ESPAÇO PESSOAL</span>
          <h1 id="auth-title">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
          <p className="auth-welcome">
            {mode === 'login' ? 'Que bom te ver de novo por aqui!' : 'Que bom ter você por aqui!'}
            <span>{mode === 'login' ? 'Continue planejando uma vida mais sua.' : 'Vamos começar a planejar uma vida mais sua.'}</span>
          </p>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {mode === 'register' && <AuthField id="auth-name" label="Nome" icon="name" value={name} error={errors.name} placeholder="Como você gosta de ser chamada?" autoComplete="name" maxLength={120} disabled={isLoading} onChange={event => setName(event.target.value)} />}
            <AuthField id="auth-email" label="E-mail" icon="email" type="email" value={email} error={errors.email} placeholder="voce@email.com" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} maxLength={255} disabled={isLoading} onChange={event => setEmail(event.target.value)} />
            <AuthField id="auth-password" label="Senha" icon="password" type="password" value={password} error={errors.password} placeholder={mode === 'login' ? 'Sua senha' : 'Mínimo de 8 caracteres'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} maxLength={128} disabled={isLoading} onChange={event => setPassword(event.target.value)} />
            {mode === 'register' && <AuthField id="auth-confirm-password" label="Confirmar senha" icon="password" type="password" value={confirmPassword} error={errors.confirmPassword} placeholder="Digite a senha novamente" autoComplete="new-password" maxLength={128} disabled={isLoading} onChange={event => setConfirmPassword(event.target.value)} />}
            {errors.form && <p className="auth-form-error" role="alert">{errors.form}</p>}
            <button className="auth-submit" type="submit" disabled={isLoading}>
              <span>{isLoading ? (mode === 'login' ? 'Entrando…' : 'Criando conta…') : (mode === 'login' ? 'Entrar' : 'Criar conta')}</span>
              {isLoading ? <LoaderCircle className="auth-spinner" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
            </button>
          </form>
          <div className="auth-switch">
            <div aria-hidden="true"><span /><Leaf /><span /></div>
            <p>{mode === 'login' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}</p>
            <Link to={mode === 'login' ? '/register' : '/login'}>{mode === 'login' ? 'Criar conta' : 'Entrar'} <ArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
        <footer><span>PRIVADO POR NATUREZA</span><span>FEITO PARA O SEU RITMO</span></footer>
      </section>
    </div>
  </main>
}

export default AuthPage
