// YumBalance web account deletion (required by Google Play and Apple).
// Flow: verify it's you (password, or a 6-digit code by email) → confirm → delete via the
// delete-account Edge Function, which removes the account and its scan counters.
// Nothing is stored in the browser: the session lives in memory and ends when the page closes.
(function () {
  var cfg = window.AVENCIA_CONFIG || {};
  var app = document.getElementById("delete-app");
  var unavailable = document.getElementById("delete-unavailable");
  if (!app) return;
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) {
    app.hidden = true;
    unavailable.hidden = false;
    return;
  }

  var client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  var $ = function (id) { return document.getElementById(id); };
  var views = { verify: $("step-verify"), confirm: $("step-confirm"), done: $("step-done") };
  var status = $("delete-status");
  var codeEmail = "";

  function show(name) {
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
    document.querySelectorAll("[data-step]").forEach(function (s) {
      if (s.getAttribute("data-step") === name) s.setAttribute("aria-current", "step");
      else s.removeAttribute("aria-current");
    });
    say("", "");
    var heading = views[name].querySelector("h2");
    if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus(); }
  }

  function say(kind, text) {
    status.className = "notice " + kind;
    status.textContent = text;
  }

  function busy(button, on, label) {
    button.disabled = on;
    if (on) { button.dataset.label = button.textContent; button.textContent = label; }
    else if (button.dataset.label) button.textContent = button.dataset.label;
  }

  function friendly(error) {
    var code = (error && (error.code || error.error_code)) || "";
    var msg = ((error && error.message) || "").toLowerCase();
    var httpStatus = error && error.status;
    if (error instanceof TypeError || msg.indexOf("failed to fetch") >= 0 || msg.indexOf("network") >= 0) {
      return "Couldn’t connect. Check your internet connection and try again.";
    }
    if (code === "invalid_credentials" || msg.indexOf("invalid login") >= 0) {
      return "That email and password don’t match an account. Check them, or choose “Email me a code instead”.";
    }
    if (code === "email_not_confirmed" || msg.indexOf("not confirmed") >= 0) {
      return "This email address hasn’t been confirmed yet. Choose “Email me a code instead” to continue.";
    }
    if (httpStatus === 429 || code.indexOf("rate_limit") >= 0 || msg.indexOf("rate limit") >= 0) {
      return "Too many attempts. Please wait a minute, then try again.";
    }
    if (code === "otp_expired" || msg.indexOf("expired") >= 0 || msg.indexOf("invalid") >= 0) {
      return "That code is incorrect or has expired. Request a new code and try again.";
    }
    return "Something went wrong. Please try again, or email " + cfg.supportEmail + ".";
  }

  function signedIn(email) {
    $("confirm-email").textContent = email;
    $("confirm-check").checked = false;
    $("delete-button").disabled = true;
    show("confirm");
  }

  // --- Verify with password ---
  $("password-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("pw-email").value.trim();
    var password = $("pw-password").value;
    if (!email || !password) { say("err", "Enter your email and password."); return; }
    var button = e.submitter || this.querySelector("button[type=submit]");
    busy(button, true, "Checking…");
    client.auth.signInWithPassword({ email: email, password: password })
      .then(function (res) {
        if (res.error) throw res.error;
        $("pw-password").value = "";
        signedIn(res.data.user ? res.data.user.email : email);
      })
      .catch(function (err) { say("err", friendly(err)); })
      .then(function () { busy(button, false); });
  });

  // --- Verify with an emailed code ---
  $("use-code").addEventListener("click", function () {
    $("password-form").hidden = true;
    $("code-form").hidden = false;
    $("code-email").value = $("pw-email").value;
    say("", "");
    $("code-email").focus();
  });
  $("use-password").addEventListener("click", function () {
    $("code-form").hidden = true;
    $("password-form").hidden = false;
    $("code-entry").hidden = true;
    say("", "");
    $("pw-email").focus();
  });

  $("send-code").addEventListener("click", function () {
    var email = $("code-email").value.trim();
    if (!$("code-email").checkValidity() || !email) { say("err", "Enter the email address you use for YumBalance."); return; }
    var button = this;
    busy(button, true, "Sending…");
    client.auth.resetPasswordForEmail(email)
      .then(function (res) {
        if (res.error) throw res.error;
        codeEmail = email;
        $("code-entry").hidden = false;
        say("ok", "If an account exists for " + email + ", we’ve emailed it a 6-digit code. The email is titled “Your YumBalance password reset code” — enter that code below.");
        $("code-value").focus();
      })
      .catch(function (err) { say("err", friendly(err)); })
      .then(function () { busy(button, false); });
  });

  $("code-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var token = $("code-value").value.replace(/\s+/g, "");
    if (!codeEmail) { say("err", "Send yourself a code first."); return; }
    if (!/^\d{6,10}$/.test(token)) { say("err", "Enter the code from the email."); return; }
    var button = e.submitter || $("verify-code");
    busy(button, true, "Verifying…");
    client.auth.verifyOtp({ email: codeEmail, token: token, type: "recovery" })
      .then(function (res) {
        if (res.error) throw res.error;
        $("code-value").value = "";
        signedIn(res.data.user ? res.data.user.email : codeEmail);
      })
      .catch(function (err) { say("err", friendly(err)); })
      .then(function () { busy(button, false); });
  });

  // --- Confirm and delete ---
  $("confirm-check").addEventListener("change", function () {
    $("delete-button").disabled = !this.checked;
  });

  $("cancel-button").addEventListener("click", function () {
    client.auth.signOut({ scope: "local" }).catch(function () {});
    show("verify");
  });

  $("delete-button").addEventListener("click", function () {
    var button = this;
    busy(button, true, "Deleting…");
    client.functions.invoke("delete-account", { body: {} })
      .then(function (res) {
        if (!res.error) return;
        var ctx = res.error.context;
        if (ctx && typeof ctx.json === "function") {
          return ctx.json().then(
            function (body) { throw { serverMessage: body && body.message }; },
            function () { throw res.error; }
          );
        }
        throw res.error;
      })
      .then(function () {
        client.auth.signOut({ scope: "local" }).catch(function () {});
        show("done");
      })
      .catch(function (err) {
        var msg = err && err.serverMessage ? err.serverMessage : friendly(err);
        say("err", msg + " If this keeps happening, email " + cfg.supportEmail + " and we’ll delete it for you.");
        busy(button, false);
      });
  });
})();
