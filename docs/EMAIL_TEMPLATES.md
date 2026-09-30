# YumBalance email templates (Supabase Auth)

Paste these into Supabase → **Authentication → Emails → Templates**:
https://supabase.com/dashboard/project/rkntgsaycxxhzkswdtnx/auth/templates

The app asks people to type the code from the email, so each template must contain `{{ .Token }}` exactly once. Don't use `{{ .ConfirmationURL }}`. After pasting, check the last line is `</div>`, then **Save changes**.

Sender settings (**Authentication → Emails → SMTP Settings**): sender email `no-reply@avencia-solutions.com`, sender name **YumBalance**.

## Confirm sign up

**Subject:** `Your YumBalance confirmation code`

```html
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
  <h2 style="margin:0 0 8px">Welcome to YumBalance 👋</h2>
  <p style="margin:0 0 24px;color:#555">Enter this code in the app to confirm your email:</p>
  <div style="font-size:34px;font-weight:800;letter-spacing:8px;background:#f3f4f6;border-radius:12px;padding:18px;text-align:center">{{ .Token }}</div>
  <p style="margin:24px 0 0;color:#777;font-size:13px">The code expires in 1 hour. If you didn't sign up for YumBalance, you can ignore this email.</p>
  <p style="margin:24px 0 0;color:#999;font-size:12px">YumBalance by Avencia Private Limited · <a href="https://avencia.io/yumbalance/" style="color:#999">avencia.io/yumbalance</a><br>Support: admin@avencia-solutions.com</p>
</div>
```

## Reset password

**Subject:** `Your YumBalance password reset code`

```html
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
  <h2 style="margin:0 0 8px">Your YumBalance code</h2>
  <p style="margin:0 0 24px;color:#555">Enter this code in YumBalance to reset your password, or on our website to confirm it's you:</p>
  <div style="font-size:34px;font-weight:800;letter-spacing:8px;background:#f3f4f6;border-radius:12px;padding:18px;text-align:center">{{ .Token }}</div>
  <p style="margin:24px 0 0;color:#777;font-size:13px">The code expires in 1 hour. If you didn't ask for this, ignore this email and nothing will change.</p>
  <p style="margin:24px 0 0;color:#999;font-size:12px">YumBalance by Avencia Private Limited · <a href="https://avencia.io/yumbalance/" style="color:#999">avencia.io/yumbalance</a><br>Support: admin@avencia-solutions.com</p>
</div>
```

The reset email is worded to cover both uses: resetting a password in the app, and verifying identity on the web account-deletion page (`avencia.io/yumbalance/delete-account/`), which uses the same code.
