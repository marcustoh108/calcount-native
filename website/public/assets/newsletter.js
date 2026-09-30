// Newsletter sign-up: stores the address in Supabase through the subscribe_newsletter() function.
(function () {
  var form = document.getElementById("newsletter-form");
  if (!form) return;
  var cfg = window.AVENCIA_CONFIG || {};
  var status = document.getElementById("newsletter-status");
  var button = form.querySelector("button[type=submit]");
  var input = form.querySelector("input[type=email]");

  function say(kind, text) {
    status.className = "notice " + kind;
    status.textContent = text;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form.querySelector(".hp input").value) return; // bot filled the hidden field
    var email = input.value.trim();
    if (!input.checkValidity() || !email) {
      say("err", "Please enter a valid email address.");
      input.focus();
      return;
    }
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      say("warn", "Sign-up is briefly unavailable. Email " + cfg.supportEmail + " with the subject “Newsletter” and we’ll add you.");
      return;
    }
    var headers = { "Content-Type": "application/json", apikey: cfg.supabaseAnonKey };
    if (cfg.supabaseAnonKey.indexOf("eyJ") === 0) headers.Authorization = "Bearer " + cfg.supabaseAnonKey;
    button.disabled = true;
    say("", "Signing you up…");
    fetch(cfg.supabaseUrl + "/rest/v1/rpc/subscribe_newsletter", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ p_email: email, p_source: "avencia-website" })
    })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          say("ok", "You’re on the list. We’ll be in touch with news and updates.");
        } else if (res.status === 400) {
          say("err", "That email address doesn’t look right. Please check it and try again.");
        } else {
          say("err", "Something went wrong on our side. Please try again in a moment.");
        }
      })
      .catch(function () {
        say("err", "Couldn’t connect. Check your internet connection and try again.");
      })
      .then(function () { button.disabled = false; });
  });
})();
