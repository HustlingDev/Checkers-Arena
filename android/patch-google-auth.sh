#!/usr/bin/env bash
set -e

GOOGLE_AUTH_FILE="node_modules/@codetrix-studio/capacitor-google-auth/android/src/main/java/com/codetrixstudio/capacitor/GoogleAuth/GoogleAuth.java"

if [ -f "$GOOGLE_AUTH_FILE" ]; then
  echo "Patching GoogleAuth.java for safe scope handling..."
  python3 - << 'EOF'
import sys

path = "node_modules/@codetrix-studio/capacitor-google-auth/android/src/main/java/com/codetrixstudio/capacitor/GoogleAuth/GoogleAuth.java"
with open(path, "r") as f:
    content = f.read()

# Replace fragile scope splitting
old_code = """    Scope[] scopes = new Scope[scopeArray.length - 1];
    Scope firstScope = new Scope(scopeArray[0]);
    for (int i = 1; i < scopeArray.length; i++) {
      scopes[i - 1] = new Scope(scopeArray[i]);
    }
    googleSignInBuilder.requestScopes(firstScope, scopes);"""

new_code = """    java.util.List<Scope> validScopes = new java.util.ArrayList<>();
    if (scopeArray != null) {
      for (String s : scopeArray) {
        if (s != null) {
          String trimmed = s.trim();
          if (!trimmed.isEmpty() && !trimmed.equalsIgnoreCase("email") && !trimmed.equalsIgnoreCase("profile")) {
            validScopes.add(new Scope(trimmed));
          }
        }
      }
    }
    if (!validScopes.isEmpty()) {
      Scope firstScope = validScopes.get(0);
      Scope[] otherScopes = new Scope[validScopes.size() - 1];
      for (int i = 1; i < validScopes.size(); i++) {
        otherScopes[i - 1] = validScopes.get(i);
      }
      googleSignInBuilder.requestScopes(firstScope, otherScopes);
    }"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(path, "w") as f:
        f.write(content)
    print("GoogleAuth.java successfully patched.")
else:
    print("GoogleAuth.java already patched or pattern not found.")
EOF
fi
