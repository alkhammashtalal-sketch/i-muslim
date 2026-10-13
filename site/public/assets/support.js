// «تواصل معنا» (reply 0033 §ج): the message alone goes to the app's server as {kind: 'support', note}, at
// POST <data-api>/api/report (worker/src/report.ts keeps the note and the day, never the address). No name, no e-mail,
// no cookie, no referrer, nothing else. Up to 500 characters, counted as the server counts them (code points).
;(function () {
  'use strict'
  var form = document.getElementById('contact')
  if (!form) return
  var MAX = 500
  var api = form.getAttribute('data-api') || ''
  var note = form.querySelector('textarea')
  var count = form.querySelector('[data-count]')
  var button = form.querySelector('button[type="submit"]')
  var label = button.textContent
  var lang = document.documentElement.lang
  var num = function (n) {
    try {
      return n.toLocaleString(lang === 'ar' ? 'ar-u-nu-arab' : 'en')
    } catch {
      return String(n)
    }
  }
  var length = function (s) {
    return Array.from(s).length
  }
  var busy = false

  function show(name) {
    var all = form.parentNode.querySelectorAll('[data-msg]')
    for (var i = 0; i < all.length; i++) all[i].hidden = all[i].getAttribute('data-msg') !== name
  }
  function update() {
    var n = length(note.value)
    count.textContent = count.getAttribute('data-template').replace('{n}', num(n)).replace('{max}', num(MAX))
    button.disabled = busy || !note.value.trim() || n > MAX
  }

  note.addEventListener('input', function () {
    show('')
    update()
  })
  form.addEventListener('submit', function (e) {
    e.preventDefault()
    var text = note.value.trim()
    if (busy || !text || length(text) > MAX) return
    busy = true
    button.textContent = button.getAttribute('data-sending')
    update()
    show('')
    fetch(api + '/api/report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'support', note: text }),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    })
      .then(
        function (r) {
          return r.ok ? 'sent' : r.status === 429 ? 'limited' : 'failed'
        },
        function () {
          return 'failed'
        },
      )
      .then(function (outcome) {
        busy = false
        button.textContent = label
        if (outcome === 'sent') {
          form.hidden = true
          note.value = ''
        }
        show(outcome)
        update()
        var shown = form.parentNode.querySelector('[data-msg="' + outcome + '"]')
        if (shown) shown.focus()
      })
  })
  form.hidden = false
  update()
})()
