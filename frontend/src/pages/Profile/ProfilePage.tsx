import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'

import {
  API_URL,
  apiRequest,
  clearAuth,
  notifyProfileUpdated,
  saveAuth,
} from '../../services/api'

import './ProfilePage.css'


type UserProfile = {
  id: number
  email: string
  name: string
  username: string | null
  bio: string
  profile_photo_url: string | null
  profile_cover_url: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at?: string | null
}


type MatchaProfileSettings = {
  favoriteColor: string
  currentAlbum: string
  currentSong: string
  watching: string
  studying: string
  biggestGoal: string
  favoriteCharacters: string
  favoriteAnimes: string
  currentObsession: string
  comfortThing: string
}


const DEFAULT_MATCHA_PROFILE: MatchaProfileSettings = {
  favoriteColor: '#9CA362',
  currentAlbum: '',
  currentSong: '',
  watching: '',
  studying: '',
  biggestGoal: '',
  favoriteCharacters: '',
  favoriteAnimes: '',
  currentObsession: '',
  comfortThing: '',
}


function privateImageUrl(
  value: string | null,
) {
  if (!value) {
    return null
  }

  if (
    value.startsWith('http://')
    || value.startsWith('https://')
  ) {
    return value
  }

  return `${API_URL}${value}`
}


function stringFromUnknown(
  value: unknown,
  fallback = '',
) {
  return typeof value === 'string'
    ? value
    : fallback
}


function readMatchaProfileSettings(
  settings: Record<string, unknown> | null | undefined,
): MatchaProfileSettings {
  const raw =
    settings
    && typeof settings.matcha_profile === 'object'
    && settings.matcha_profile !== null
      ? settings.matcha_profile as Record<string, unknown>
      : {}

  return {
    favoriteColor: stringFromUnknown(
      raw.favoriteColor,
      DEFAULT_MATCHA_PROFILE.favoriteColor,
    ),
    currentAlbum: stringFromUnknown(raw.currentAlbum),
    currentSong: stringFromUnknown(raw.currentSong),
    watching: stringFromUnknown(raw.watching),
    studying: stringFromUnknown(raw.studying),
    biggestGoal: stringFromUnknown(raw.biggestGoal),
    favoriteCharacters: stringFromUnknown(
      raw.favoriteCharacters,
    ),
    favoriteAnimes: stringFromUnknown(raw.favoriteAnimes),
    currentObsession: stringFromUnknown(raw.currentObsession),
    comfortThing: stringFromUnknown(raw.comfortThing),
  }
}


function ProfilePage() {
  const [profile, setProfile] =
    useState<UserProfile | null>(null)

  const [bio, setBio] =
    useState('')

  const [accountName, setAccountName] =
    useState('')

  const [accountUsername, setAccountUsername] =
    useState('')

  const [matchaProfile, setMatchaProfile] =
    useState<MatchaProfileSettings>(
      DEFAULT_MATCHA_PROFILE,
    )

  const [currentPassword, setCurrentPassword] =
    useState('')

  const [newPassword, setNewPassword] =
    useState('')

  const [deletePassword, setDeletePassword] =
    useState('')

  const [deleteConfirmation, setDeleteConfirmation] =
    useState('')

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [savingAbout, setSavingAbout] =
    useState(false)

  const [savingAccount, setSavingAccount] =
    useState(false)


  useEffect(() => {
    let cancelled = false

    apiRequest<UserProfile>(
      '/profile',
    )
      .then((data) => {
        if (cancelled) {
          return
        }

        setProfile(data)
        setBio(data.bio ?? '')
        setAccountName(data.name ?? '')
        setAccountUsername(data.username ?? '')
        setMatchaProfile(
          readMatchaProfileSettings(
            data.settings,
          ),
        )
      })
      .catch((caughtError) => {
        if (cancelled) {
          return
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Não foi possível carregar o perfil.',
        )
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])


  function updateFunField(
    field: keyof MatchaProfileSettings,
    value: string,
  ) {
    setMatchaProfile(
      (current) => ({
        ...current,
        [field]: value,
      }),
    )
  }


  async function handleSaveAbout(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!profile) {
      return
    }

    try {
      setSavingAbout(true)
      setError('')
      setMessage('')

      const updatedProfile =
        await apiRequest<UserProfile>(
          '/profile',
          {
            method: 'PATCH',
            body: JSON.stringify({
              bio,
              settings: {
                matcha_profile:
                  matchaProfile,
              },
            }),
          },
        )
      setProfile(updatedProfile)
      saveAuth(updatedProfile)
      notifyProfileUpdated(updatedProfile)
      setMessage(
        'Seu cantinho foi atualizado ✦',
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível salvar seu perfil.',
      )
    } finally {
      setSavingAbout(false)
    }
  }


  async function handleSaveAccount(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const normalizedUsername =
      accountUsername
        .trim()
        .replace(/^@+/, '')
        .toLowerCase()

    try {
      setSavingAccount(true)
      setError('')
      setMessage('')

      const updated =
        await apiRequest<UserProfile>(
          '/profile',
          {
            method: 'PATCH',
            body: JSON.stringify({
              name: accountName.trim(),
              username:
                normalizedUsername === ''
                  ? null
                  : normalizedUsername,
            }),
          },
        )

      setProfile(updated)
      setAccountName(updated.name ?? '')
      setAccountUsername(updated.username ?? '')
      saveAuth(updated)
      notifyProfileUpdated(updated)
      setMessage('Dados da conta atualizados.')
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível atualizar os dados da conta.',
      )
    } finally {
      setSavingAccount(false)
    }
  }


  async function uploadImage(
    event: ChangeEvent<HTMLInputElement>,
    endpoint:
      | '/profile/photo'
      | '/profile/cover',
  ) {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      setError('')
      setMessage('')

      const formData =
        new FormData()

      formData.append(
        'file',
        file,
      )

      const updated =
        await apiRequest<UserProfile>(
          endpoint,
          {
            method: 'POST',
            body: formData,
          },
        )

      setProfile(updated)
      saveAuth(updated)
      notifyProfileUpdated(updated)
      setMessage(
        endpoint === '/profile/photo'
          ? 'Foto atualizada com sucesso.'
          : 'Capa atualizada com sucesso.',
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível enviar a imagem.',
      )
    } finally {
      event.target.value = ''
    }
  }


  async function removeImage(
    endpoint:
      | '/profile/photo'
      | '/profile/cover',
  ) {
    try {
      setError('')
      setMessage('')

      const updated =
        await apiRequest<UserProfile>(
          endpoint,
          {
            method: 'DELETE',
          },
        )

      setProfile(updated)
      saveAuth(updated)
      notifyProfileUpdated(updated)
      setMessage('Imagem removida com sucesso.')
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível remover a imagem.',
      )
    }
  }


  async function handlePassword(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    try {
      setError('')
      setMessage('')

      await apiRequest<void>(
        '/profile/change-password',
        {
          method: 'POST',
          body: JSON.stringify({
            current_password:
              currentPassword,
            new_password:
              newPassword,
          }),
        },
      )

      setCurrentPassword('')
      setNewPassword('')
      setMessage('Senha alterada com sucesso.')
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível alterar a senha.',
      )
    }
  }


  async function handleDeleteAccount(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      deleteConfirmation
        .trim()
        .toUpperCase()
      !== 'DELETE'
    ) {
      setError(
        'Digite DELETE para confirmar a exclusão.',
      )
      return
    }

    const confirmed =
      window.confirm(
        'Excluir permanentemente sua conta e todos os dados?',
      )

    if (!confirmed) {
      return
    }

    try {
      setError('')
      setMessage('')

      await apiRequest<void>(
        '/profile/account',
        {
          method: 'DELETE',
          body: JSON.stringify({
            password:
              deletePassword,
            confirmation:
              'DELETE',
          }),
        },
      )

      clearAuth()
      window.location.replace(
        '/login',
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível excluir a conta.',
      )
    }
  }


  if (loading) {
    return (
      <section className="profile-page">
        <div className="profile-loading">
          Arrumando seu cantinho...
        </div>
      </section>
    )
  }


  if (!profile) {
    return (
      <section className="profile-page">
        <div className="profile-message error">
          Não foi possível carregar o perfil.
        </div>
      </section>
    )
  }


  const photoUrl =
    privateImageUrl(
      profile.profile_photo_url,
    )

  const coverUrl =
    privateImageUrl(
      profile.profile_cover_url,
    )

  const displayName =
    profile.name
    || profile.username
    || 'Meu perfil'

  const initial =
    displayName
      .charAt(0)
      .toUpperCase()


  return (
    <section className="profile-page">
      <div className="profile-page-inner">
        <header className="profile-intro">
          <span className="profile-kicker">
            MEU CANTINHO
          </span>

          <h1>
            Sobre mim
          </h1>

          <p>
            Um pedacinho de quem você é fora das listas e dos prazos.
          </p>
        </header>


        {message && (
          <div className="profile-message success">
            {message}
          </div>
        )}

        {error && (
          <div className="profile-message error">
            {error}
          </div>
        )}


        <article className="profile-hero-card">
          <div
            className="profile-cover"
            style={
              coverUrl
                ? {
                    backgroundImage:
                      `url("${coverUrl}")`,
                  }
                : undefined
            }
          >
            <div className="profile-cover-actions">
              <label className="profile-mini-button">
                Alterar capa
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={(event) =>
                    void uploadImage(
                      event,
                      '/profile/cover',
                    )
                  }
                />
              </label>

              {coverUrl && (
                <button
                  type="button"
                  className="profile-mini-button subtle"
                  onClick={() =>
                    void removeImage(
                      '/profile/cover',
                    )
                  }
                >
                  Remover
                </button>
              )}
            </div>
          </div>

          <div className="profile-hero-content">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar-large">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Foto de perfil"
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>

              <div className="profile-avatar-actions">
                <label className="profile-text-action">
                  Trocar foto
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    hidden
                    onChange={(event) =>
                      void uploadImage(
                        event,
                        '/profile/photo',
                      )
                    }
                  />
                </label>

                {photoUrl && (
                  <button
                    type="button"
                    className="profile-text-action"
                    onClick={() =>
                      void removeImage(
                        '/profile/photo',
                      )
                    }
                  >
                    remover
                  </button>
                )}
              </div>
            </div>

            <div className="profile-identity-copy">
              <strong>{displayName}</strong>

              <span>
                {profile.username
                  ? `@${profile.username}`
                  : profile.email}
              </span>

              <p>
                {bio.trim() !== ''
                  ? bio
                  : 'Escreva uma bio que pareça com você.'}
              </p>
            </div>

            <div className="profile-color-badge">
              <span>cor favorita</span>
              <i
                style={{
                  backgroundColor:
                    matchaProfile.favoriteColor,
                }}
              />
            </div>
          </div>
        </article>


        <form
          className="profile-about-form"
          onSubmit={handleSaveAbout}
        >
          <section className="profile-section-card profile-bio-card">
            <div className="profile-card-title-row">
              <div>
                <span>01</span>
                <h2>Bio</h2>
              </div>
              <small>até 1000 caracteres</small>
            </div>

            <textarea
              value={bio}
              maxLength={1000}
              rows={5}
              placeholder="Conte um pouco sobre você..."
              onChange={(event) =>
                setBio(event.target.value)
              }
            />
          </section>


          <section className="profile-personality-grid">
            <article className="profile-note-card note-green">
              <span className="profile-note-label">
                MINHA COR
              </span>
              <h3>Cor preferida</h3>
              <div className="profile-color-input-row">
                <input
                  type="color"
                  value={matchaProfile.favoriteColor}
                  aria-label="Escolher cor favorita"
                  onChange={(event) =>
                    updateFunField(
                      'favoriteColor',
                      event.target.value,
                    )
                  }
                />
                <input
                  type="text"
                  value={matchaProfile.favoriteColor}
                  maxLength={20}
                  onChange={(event) =>
                    updateFunField(
                      'favoriteColor',
                      event.target.value,
                    )
                  }
                />
              </div>
            </article>


            <article className="profile-note-card note-lilac">
              <span className="profile-note-label">
                TOCANDO AGORA
              </span>
              <h3>Álbum do momento</h3>
              <input
                type="text"
                value={matchaProfile.currentAlbum}
                maxLength={160}
                placeholder="álbum — artista"
                onChange={(event) =>
                  updateFunField(
                    'currentAlbum',
                    event.target.value,
                  )
                }
              />
              <label>
                música do momento
                <input
                  type="text"
                  value={matchaProfile.currentSong}
                  maxLength={160}
                  placeholder="música — artista"
                  onChange={(event) =>
                    updateFunField(
                      'currentSong',
                      event.target.value,
                    )
                  }
                />
              </label>
            </article>


            <article className="profile-note-card note-blue">
              <span className="profile-note-label">
                NA MINHA TELA
              </span>
              <h3>O que estou vendo</h3>
              <textarea
                value={matchaProfile.watching}
                rows={4}
                maxLength={500}
                placeholder="filmes, séries, doramas, vídeos..."
                onChange={(event) =>
                  updateFunField(
                    'watching',
                    event.target.value,
                  )
                }
              />
            </article>


            <article className="profile-note-card note-yellow">
              <span className="profile-note-label">
                APRENDENDO
              </span>
              <h3>O que eu estudo</h3>
              <textarea
                value={matchaProfile.studying}
                rows={4}
                maxLength={500}
                placeholder="curso, matéria, linguagem, assunto..."
                onChange={(event) =>
                  updateFunField(
                    'studying',
                    event.target.value,
                  )
                }
              />
            </article>


            <article className="profile-note-card note-pink">
              <span className="profile-note-label">
                GRANDE SONHO
              </span>
              <h3>Meu maior objetivo</h3>
              <textarea
                value={matchaProfile.biggestGoal}
                rows={4}
                maxLength={700}
                placeholder="a coisa que eu mais quero construir, viver ou conquistar..."
                onChange={(event) =>
                  updateFunField(
                    'biggestGoal',
                    event.target.value,
                  )
                }
              />
            </article>


            <article className="profile-note-card note-seafoam">
              <span className="profile-note-label">
                FAVORITOS
              </span>
              <h3>Personagens preferidos</h3>
              <textarea
                value={matchaProfile.favoriteCharacters}
                rows={4}
                maxLength={500}
                placeholder="personagens que moram na sua cabeça de graça..."
                onChange={(event) =>
                  updateFunField(
                    'favoriteCharacters',
                    event.target.value,
                  )
                }
              />
            </article>


            <article className="profile-note-card note-orange">
              <span className="profile-note-label">
                ANIMES
              </span>
              <h3>Meus animes</h3>
              <textarea
                value={matchaProfile.favoriteAnimes}
                rows={4}
                maxLength={500}
                placeholder="favoritos, atuais, comfort animes..."
                onChange={(event) =>
                  updateFunField(
                    'favoriteAnimes',
                    event.target.value,
                  )
                }
              />
            </article>


            <article className="profile-note-card note-cream">
              <span className="profile-note-label">
                HIPERFOCO DO MOMENTO
              </span>
              <h3>Obcecada por...</h3>
              <input
                type="text"
                value={matchaProfile.currentObsession}
                maxLength={220}
                placeholder="um jogo, uma estética, uma música, qualquer coisa"
                onChange={(event) =>
                  updateFunField(
                    'currentObsession',
                    event.target.value,
                  )
                }
              />
              <label>
                meu conforto
                <input
                  type="text"
                  value={matchaProfile.comfortThing}
                  maxLength={220}
                  placeholder="algo que sempre me faz bem"
                  onChange={(event) =>
                    updateFunField(
                      'comfortThing',
                      event.target.value,
                    )
                  }
                />
              </label>
            </article>
          </section>


          <div className="profile-save-bar">
            <p>
              Esse perfil é seu diário de identidade — mude quando sua fase mudar.
            </p>

            <button
              type="submit"
              disabled={savingAbout}
            >
              {savingAbout
                ? 'Salvando...'
                : 'Salvar meu perfil'}
            </button>
          </div>
        </form>


        <section className="profile-private-zone">
          <div className="profile-private-heading">
            <span>ÁREA PRIVADA</span>
            <h2>Conta e segurança</h2>
            <p>
              Informações sensíveis ficam recolhidas para não ocupar seu perfil do dia a dia.
            </p>
          </div>

          <details className="profile-private-details">
            <summary>
              <span>
                <b>Dados da conta</b>
                <small>nome, username e e-mail</small>
              </span>
              <i>+</i>
            </summary>

            <form
              className="profile-private-form"
              onSubmit={handleSaveAccount}
            >
              <label>
                Nome
                <input
                  type="text"
                  value={accountName}
                  maxLength={120}
                  onChange={(event) =>
                    setAccountName(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                Username
                <div className="profile-username-field">
                  <span>@</span>
                  <input
                    type="text"
                    value={accountUsername}
                    minLength={3}
                    maxLength={50}
                    onChange={(event) =>
                      setAccountUsername(
                        event.target.value,
                      )
                    }
                  />
                </div>
              </label>

              <label className="profile-full">
                E-mail
                <input
                  type="email"
                  value={profile.email}
                  disabled
                />
              </label>

              <button
                type="submit"
                disabled={savingAccount}
              >
                {savingAccount
                  ? 'Salvando...'
                  : 'Salvar dados da conta'}
              </button>
            </form>
          </details>


          <details className="profile-private-details">
            <summary>
              <span>
                <b>Senha e sessões</b>
                <small>alterar senha da conta</small>
              </span>
              <i>+</i>
            </summary>

            <form
              className="profile-private-form"
              onSubmit={handlePassword}
            >
              <label>
                Senha atual
                <input
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  required
                  value={currentPassword}
                  onChange={(event) =>
                    setCurrentPassword(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                Nova senha
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(
                      event.target.value,
                    )
                  }
                />
              </label>

              <button type="submit">
                Alterar senha
              </button>
            </form>
          </details>


          <details className="profile-private-details danger">
            <summary>
              <span>
                <b>Zona de perigo</b>
                <small>excluir permanentemente a conta</small>
              </span>
              <i>+</i>
            </summary>

            <form
              className="profile-private-form danger-form"
              onSubmit={handleDeleteAccount}
            >
              <label>
                Sua senha
                <input
                  type="password"
                  minLength={8}
                  required
                  value={deletePassword}
                  onChange={(event) =>
                    setDeletePassword(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                Digite DELETE
                <input
                  type="text"
                  required
                  value={deleteConfirmation}
                  onChange={(event) =>
                    setDeleteConfirmation(
                      event.target.value,
                    )
                  }
                />
              </label>

              <button type="submit">
                Excluir minha conta
              </button>
            </form>
          </details>
        </section>
      </div>
    </section>
  )
}


export default ProfilePage
