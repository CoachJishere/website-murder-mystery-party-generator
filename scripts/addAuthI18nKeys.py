#!/usr/bin/env python3
"""
One-off: add the missing auth/navigation translation keys exposed by the
AuthButton + SignInPrompt + Header refactor. Existing keys are preserved;
we only add what's missing (does not overwrite).
"""
import json
from pathlib import Path
from collections import OrderedDict

LOCALES_DIR = Path(__file__).parent.parent / "src" / "i18n" / "locales"

# Per-locale additions. Only the keys that did not previously exist.
ADDITIONS = {
    "en": {
        "navigation": {
            "accountSettings": "Account Settings",
            "toggleMenu": "Toggle menu",
        },
        "auth": {
            "signInPrompt": {
                "description": "Sign up for free to create your own custom murder mystery, or log into an existing account.",
                "or": "or",
            },
            "errors": {
                "googleSignInFailed": "Failed to sign in with Google",
                "googleSignInInitFailed": "Failed to initiate Google sign-in.",
                "unexpected": "An unexpected error occurred",
            },
        },
    },
    "es": {
        "navigation": {
            "accountSettings": "Configuración de la cuenta",
            "toggleMenu": "Abrir menú",
        },
        "auth": {
            "signInPrompt": {
                "description": "Regístrate gratis para crear tu propio misterio de asesinato personalizado, o inicia sesión en tu cuenta.",
                "or": "o",
            },
            "errors": {
                "googleSignInFailed": "No se pudo iniciar sesión con Google",
                "googleSignInInitFailed": "No se pudo iniciar el inicio de sesión con Google.",
                "unexpected": "Se produjo un error inesperado",
            },
        },
    },
    "fr": {
        "navigation": {
            "accountSettings": "Paramètres du compte",
            "toggleMenu": "Ouvrir le menu",
        },
        "auth": {
            "signInPrompt": {
                "description": "Inscrivez-vous gratuitement pour créer votre propre soirée enquête personnalisée, ou connectez-vous à votre compte.",
                "or": "ou",
            },
            "errors": {
                "googleSignInFailed": "Échec de la connexion avec Google",
                "googleSignInInitFailed": "Impossible de lancer la connexion avec Google.",
                "unexpected": "Une erreur inattendue s'est produite",
            },
        },
    },
    "de": {
        "navigation": {
            "accountSettings": "Kontoeinstellungen",
            "toggleMenu": "Menü öffnen",
        },
        "auth": {
            "signInPrompt": {
                "description": "Registriere dich kostenlos, um dein eigenes Krimi-Dinner zu erstellen, oder melde dich in deinem Konto an.",
                "or": "oder",
            },
            "errors": {
                "googleSignInFailed": "Anmeldung mit Google fehlgeschlagen",
                "googleSignInInitFailed": "Google-Anmeldung konnte nicht gestartet werden.",
                "unexpected": "Ein unerwarteter Fehler ist aufgetreten",
            },
        },
    },
    "it": {
        "navigation": {
            "accountSettings": "Impostazioni account",
            "toggleMenu": "Apri menu",
        },
        "auth": {
            "signInPrompt": {
                "description": "Registrati gratuitamente per creare la tua festa di mistero personalizzata, o accedi al tuo account.",
                "or": "o",
            },
            "errors": {
                "googleSignInFailed": "Accesso con Google non riuscito",
                "googleSignInInitFailed": "Impossibile avviare l'accesso con Google.",
                "unexpected": "Si è verificato un errore imprevisto",
            },
        },
    },
    "pt": {
        "navigation": {
            "accountSettings": "Definições da conta",
            "toggleMenu": "Abrir menu",
        },
        "auth": {
            "signInPrompt": {
                "description": "Regista-te gratuitamente para criar o teu próprio mistério de assassinato personalizado, ou inicia sessão na tua conta.",
                "or": "ou",
            },
            "errors": {
                "googleSignInFailed": "Falha ao iniciar sessão com Google",
                "googleSignInInitFailed": "Não foi possível iniciar a sessão com Google.",
                "unexpected": "Ocorreu um erro inesperado",
            },
        },
    },
    "nl": {
        "navigation": {
            "accountSettings": "Accountinstellingen",
            "toggleMenu": "Menu openen",
        },
        "auth": {
            "signInPrompt": {
                "description": "Meld je gratis aan om je eigen aangepaste moordmysterie te maken, of log in op een bestaand account.",
                "or": "of",
            },
            "errors": {
                "googleSignInFailed": "Inloggen met Google mislukt",
                "googleSignInInitFailed": "Inloggen met Google kon niet worden gestart.",
                "unexpected": "Er is een onverwachte fout opgetreden",
            },
        },
    },
    "da": {
        "navigation": {
            "accountSettings": "Kontoindstillinger",
            "toggleMenu": "Åbn menu",
        },
        "auth": {
            "signInPrompt": {
                "description": "Tilmeld dig gratis for at lave dit eget skræddersyede mordmysterium, eller log ind på en eksisterende konto.",
                "or": "eller",
            },
            "errors": {
                "googleSignInFailed": "Kunne ikke logge ind med Google",
                "googleSignInInitFailed": "Kunne ikke starte Google-login.",
                "unexpected": "Der opstod en uventet fejl",
            },
        },
    },
    "sv": {
        "navigation": {
            "accountSettings": "Kontoinställningar",
            "toggleMenu": "Öppna meny",
        },
        "auth": {
            "signInPrompt": {
                "description": "Registrera dig gratis för att skapa ditt eget skräddarsydda mordmysterium, eller logga in på ett befintligt konto.",
                "or": "eller",
            },
            "errors": {
                "googleSignInFailed": "Det gick inte att logga in med Google",
                "googleSignInInitFailed": "Det gick inte att starta Google-inloggningen.",
                "unexpected": "Ett oväntat fel inträffade",
            },
        },
    },
    "fi": {
        "navigation": {
            "accountSettings": "Tilin asetukset",
            "toggleMenu": "Avaa valikko",
        },
        "auth": {
            "signInPrompt": {
                "description": "Rekisteröidy ilmaiseksi luodaksesi oman räätälöidyn murhamysteerin tai kirjaudu olemassa olevalle tilille.",
                "or": "tai",
            },
            "errors": {
                "googleSignInFailed": "Google-kirjautuminen epäonnistui",
                "googleSignInInitFailed": "Google-kirjautumisen aloitus epäonnistui.",
                "unexpected": "Tapahtui odottamaton virhe",
            },
        },
    },
    "ko": {
        "navigation": {
            "accountSettings": "계정 설정",
            "toggleMenu": "메뉴 열기",
        },
        "auth": {
            "signInPrompt": {
                "description": "무료로 가입하여 나만의 머더 미스터리를 만들거나 기존 계정에 로그인하세요.",
                "or": "또는",
            },
            "errors": {
                "googleSignInFailed": "Google 로그인에 실패했습니다",
                "googleSignInInitFailed": "Google 로그인을 시작할 수 없습니다.",
                "unexpected": "예기치 않은 오류가 발생했습니다",
            },
        },
    },
    "ja": {
        "navigation": {
            "accountSettings": "アカウント設定",
            "toggleMenu": "メニューを開く",
        },
        "auth": {
            "signInPrompt": {
                "description": "無料で登録してオリジナルのマーダーミステリーを作成するか、既存のアカウントにログインしてください。",
                "or": "または",
            },
            "errors": {
                "googleSignInFailed": "Googleでのサインインに失敗しました",
                "googleSignInInitFailed": "Googleサインインを開始できませんでした。",
                "unexpected": "予期しないエラーが発生しました",
            },
        },
    },
    "zh-cn": {
        "navigation": {
            "accountSettings": "账户设置",
            "toggleMenu": "打开菜单",
        },
        "auth": {
            "signInPrompt": {
                "description": "免费注册以创建您自己的定制谋杀谜案,或登录现有账户。",
                "or": "或",
            },
            "errors": {
                "googleSignInFailed": "Google 登录失败",
                "googleSignInInitFailed": "无法启动 Google 登录。",
                "unexpected": "发生意外错误",
            },
        },
    },
}


def deep_merge_keep_existing(target, additions):
    """Recursively add keys from `additions` into `target`, but never overwrite
    keys that already exist in `target`."""
    for key, value in additions.items():
        if isinstance(value, dict):
            if key not in target or not isinstance(target.get(key), dict):
                target[key] = OrderedDict()
            deep_merge_keep_existing(target[key], value)
        else:
            if key not in target:
                target[key] = value


def main():
    for locale_code, additions in ADDITIONS.items():
        path = LOCALES_DIR / f"{locale_code}.json"
        if not path.exists():
            print(f"  SKIP: {path} (file not found)")
            continue
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f, object_pairs_hook=OrderedDict)
        deep_merge_keep_existing(data, additions)
        with path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"  OK:   {path.name}")


if __name__ == "__main__":
    main()
