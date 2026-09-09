self.addEventListener(
  'install',
  function (event) {
    event.waitUntil(
      self.skipWaiting()
    )
  }
)

self.addEventListener(
  'activate',
  function (event) {
    event.waitUntil(
      self.clients.claim()
    )
  }
)

self.addEventListener(
  'push',
  function (event) {
    var title =
      'Planner Digital'

    var options = {
      body:
        'Voce tem um lembrete.',
      data: {
        url: '/calendar'
      }
    }

    if (event.data) {
      try {
        var received =
          event.data.json()

        if (received.title) {
          title =
            received.title
        }

        if (received.body) {
          options.body =
            received.body
        }

        if (received.url) {
          options.data.url =
            received.url
        }
      } catch (error) {
        options.body =
          'Voce tem um lembrete.'
      }
    }

    event.waitUntil(
      self.registration
        .showNotification(
          title,
          options
        )
    )
  }
)

self.addEventListener(
  'notificationclick',
  function (event) {
    event.notification.close()

    event.waitUntil(
      self.clients.openWindow(
        '/calendar'
      )
    )
  }
)