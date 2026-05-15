# -*- coding: utf-8 -*-
"""Vérifie que l'option « compte » est toujours accessible depuis index.html,
même si le module Supabase échoue.
"""

import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    with open(os.path.join(ROOT, path), 'r', encoding='utf-8') as f:
        return f.read()


def test_index_has_permanent_navbar_account_link():
    html = read('index.html')
    assert 'id="nav-account"' in html, 'Bouton compte permanent manquant dans la navbar'
    assert "href=\"login.html\"" in html, 'Lien vers login.html absent'
    assert 'id="nav-account-label"' in html, 'Label dynamique manquant'


def test_index_guest_bar_visible_par_defaut():
    html = read('index.html')
    # Avant : <div class="guest-bar hidden" — la classe hidden cachait le bouton
    assert '<div class="guest-bar" id="guest-bar">' in html, \
        'guest-bar doit être visible par défaut (sans classe hidden)'


def test_index_supabase_module_fault_tolerant():
    html = read('index.html')
    # On veut un try/catch autour de l'import du module Supabase
    assert "try {\n  const mod = await import('./auth/supabase.js');" in html, \
        "L'import Supabase doit être protégé par try/catch"
    assert 'mode invité forcé' in html or 'mode-invite' in html.lower() or \
        'mode invité' in html, "Message de fallback en mode invité absent"


def test_index_init_no_longer_force_redirect():
    html = read('index.html')
    # On ne doit plus forcer location.href = 'login.html' quand non connecté
    # (l'utilisateur garde l'accès via la navbar)
    bad = "if (!session && !isGuest) {\n    // Ni connecté ni invité → page de connexion\n    location.href = 'login.html';"
    assert bad not in html, 'Le redirect automatique vers login.html ne doit plus exister'


def test_index_init_has_catch_fallback():
    html = read('index.html')
    assert "init().catch(" in html, "init() doit avoir un .catch() de fallback"


def test_login_html_module_fault_tolerant():
    html = read('login.html')
    assert "try {\n  const mod = await import('./auth/supabase.js');" in html, \
        "login.html : l'import Supabase doit être en try/catch"
    assert 'Service de comptes indisponible' in html, \
        "login.html : message d'erreur fallback manquant"


def test_profile_html_module_fault_tolerant():
    html = read('profile.html')
    assert "try {\n  const mod = await import('./auth/supabase.js');" in html, \
        "profile.html : l'import Supabase doit être en try/catch"
    # Profile doit rediriger plutôt que rester sur "Chargement…"
    assert "location.href = 'login.html'" in html or \
           "location.href = 'index.html'" in html, \
        'profile.html doit rediriger si auth échoue'


def test_login_form_static_still_present():
    """Le formulaire de login est rendu statiquement (HTML), donc il reste
    visible même si le module ESM échoue."""
    html = read('login.html')
    assert 'id="tab-login"' in html
    assert 'id="tab-register"' in html
    assert 'id="username"' in html
    assert 'id="password"' in html
    assert 'continuerInvite()' in html, 'Bouton "Continuer en invité" doit rester fonctionnel'


def test_handleSignOut_reste_sur_hub():
    """Après déconnexion, on ne force plus une redirection vers login —
    on bascule l'UI en mode invité sur place."""
    html = read('index.html')
    # On veut voir setNavAccount({ loggedIn: false }) dans handleSignOut
    sign_out_block = html[html.find('window.handleSignOut'):html.find('window.handleSignOut') + 500]
    assert 'showGuestBar()' in sign_out_block, \
        'handleSignOut doit appeler showGuestBar() au lieu de rediriger'


if __name__ == '__main__':
    tests = [
        test_index_has_permanent_navbar_account_link,
        test_index_guest_bar_visible_par_defaut,
        test_index_supabase_module_fault_tolerant,
        test_index_init_no_longer_force_redirect,
        test_index_init_has_catch_fallback,
        test_login_html_module_fault_tolerant,
        test_profile_html_module_fault_tolerant,
        test_login_form_static_still_present,
        test_handleSignOut_reste_sur_hub,
    ]
    failures = 0
    for t in tests:
        try:
            t()
            print(f"[OK]   {t.__name__}")
        except AssertionError as e:
            failures += 1
            print(f"[FAIL] {t.__name__}: {e}")
        except Exception as e:
            failures += 1
            print(f"[ERR ] {t.__name__}: {type(e).__name__}: {e}")
    print(f"\n{len(tests) - failures}/{len(tests)} tests OK")
    sys.exit(0 if failures == 0 else 1)
