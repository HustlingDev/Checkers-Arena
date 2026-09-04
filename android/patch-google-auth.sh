#!/usr/bin/env bash
set -e

GOOGLE_AUTH_FILE="node_modules/@codetrix-studio/capacitor-google-auth/android/src/main/java/com/codetrixstudio/capacitor/GoogleAuth/GoogleAuth.java"

if [ -f "$GOOGLE_AUTH_FILE" ]; then
  echo "Patching GoogleAuth.java for safe scope handling and server client ID resolution..."
  python3 - << 'EOF'
import sys

path = "node_modules/@codetrix-studio/capacitor-google-auth/android/src/main/java/com/codetrixstudio/capacitor/GoogleAuth/GoogleAuth.java"
with open(path, "r") as f:
    content = f.read()

# 1. Fix Client ID resolution to always prioritize serverClientId (Web Client ID needed by requestIdToken)
old_client_id = """    String clientId = getConfig().getString("androidClientId",
      getConfig().getString("clientId",
        this.getContext().getString(R.string.server_client_id)));"""

new_client_id = """    String clientId = getConfig().getString("serverClientId",
      getConfig().getString("clientId",
        this.getContext().getString(R.string.server_client_id)));"""

if old_client_id in content:
    content = content.replace(old_client_id, new_client_id)
    print("GoogleAuth.java: clientId resolution patched to serverClientId.")

# 2. Fix fragile scope splitting and avoid redundant basic scopes that cause Developer Error 10
old_scopes = """    Scope[] scopes = new Scope[scopeArray.length - 1];
    Scope firstScope = new Scope(scopeArray[0]);
    for (int i = 1; i < scopeArray.length; i++) {
      scopes[i - 1] = new Scope(scopeArray[i]);
    }
    googleSignInBuilder.requestScopes(firstScope, scopes);"""

new_scopes = """    java.util.List<Scope> validScopes = new java.util.ArrayList<>();
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

if old_scopes in content:
    content = content.replace(old_scopes, new_scopes)
    print("GoogleAuth.java: Scope handling patched.")

with open(path, "w") as f:
    f.write(content)
print("GoogleAuth.java patching complete.")
EOF
fi
