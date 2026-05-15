# -*- coding: utf-8 -*-
"""Vérifie le fix login + flux d'inscription par défaut."""

import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read(p):
    with open(os.path.join(ROOT, p), 'r', encoding='utf-8') as f:
        return f.read()


def test_login_default_tab_register():
    html = read('login.html')
    # L'onglet Inscription doit être 'active' par défaut
    assert 'class="tab active" id="tab-register"' in html, \
        "L'onglet Inscription doit être 'active' au chargement"
    assert "let activeTab = 'register';" in html, \
        "activeTab doit valoir 'register' par défaut"
    assert "switchTab('register');" in html, \
        "switchTab('register') doit être appelé pour forcer l'état initial"


def test_login_button_label_default_inscription():
    html = read('login.html')
    # Le bouton submit doit afficher "S'inscrire" au chargement initial
    assert ">\n    S'inscrire\n  </button>" in html, \
        "Le bouton submit doit afficher 'S'inscrire' par défaut"


def test_login_button_never_disabled_on_module_failure():
    html = read('login.html')
    # On veut PLUS de btn-submit.disabled = true au catch du module
    bad = "document.getElementById('btn-submit').disabled = true;"
    assert bad not in html, \
        "Le bouton submit ne doit JAMAIS être désactivé : l'utilisateur doit pouvoir cliquer et voir une erreur."


def test_login_has_visible_diagnostic_panel():
    html = read('login.html')
    assert 'id="diag"' in html, 'Panneau diag absent'
    assert 'id="diag-mod"' in html, 'Ligne Module manquante'
    assert 'id="diag-sess"' in html, 'Ligne Session manquante'
    assert 'id="diag-err"' in html, 'Ligne Erreur manquante'
    assert "setDiag('mod', 'chargé" in html, "setDiag doit indiquer 'chargé' au succès"
    assert "setDiag('mod', 'échec" in html, "setDiag doit indiquer 'échec' au catch"


def test_login_handleAuth_defined_before_any_await():
    html = read('login.html')
    # Récupère la position de window.handleAuth = et la position du premier await
    h = html.find('window.handleAuth = async')
    a = html.find('await import')
    assert h != -1 and a != -1
    assert h < a, "window.handleAuth doit être assigné AVANT tout await"


def test_login_handleAuth_shows_diag_on_error():
    html = read('login.html')
    assert "setDiag('err', msg, 'fail')" in html, \
        "handleAuth doit pousser l'erreur dans le panneau diag"


def test_index_redirige_si_pas_de_session():
    html = read('index.html')
    assert "if (!session && !isGuest && supabaseReachable) {" in html, \
        'index.html doit rediriger vers login.html si pas de session et Supabase joignable'
    # juste après cette ligne il y a un location.href
    snippet = html[html.find("if (!session && !isGuest && supabaseReachable)"):]
    assert "location.href = 'login.html';" in snippet[:200], \
        'La redirection vers login.html doit suivre la condition'


def test_index_garde_le_fallback_invite_si_supabase_unreachable():
    html = read('index.html')
    # Si Supabase est injoignable, on NE redirige PAS (sinon boucle infinie)
    assert 'supabaseReachable = false;' in html, \
        'Le flag supabaseReachable doit basculer à false si getSession échoue'


def test_login_html_garde_continuer_en_invite():
    html = read('login.html')
    assert 'continuerInvite()' in html, "Bouton 'Continuer en invité' doit rester accessible"


if __name__ == '__main__':
    tests = [
        test_login_default_tab_register,
        test_login_button_label_default_inscription,
        test_login_button_never_disabled_on_module_failure,
        test_login_has_visible_diagnostic_panel,
        test_login_handleAuth_defined_before_any_await,
        test_login_handleAuth_shows_diag_on_error,
        test_index_redirige_si_pas_de_session,
        test_index_garde_le_fallback_invite_si_supabase_unreachable,
        test_login_html_garde_continuer_en_invite,
    ]
    failures = 0
    for t in tests:
        try:
            t(); print(f"[OK]   {t.__name__}")
        except AssertionError as e:
            failures += 1; print(f"[FAIL] {t.__name__}: {e}")
        except Exception as e:
            failures += 1; print(f"[ERR ] {t.__name__}: {type(e).__name__}: {e}")
    print(f"\n{len(tests) - failures}/{len(tests)} tests OK")
    sys.exit(0 if failures == 0 else 1)
