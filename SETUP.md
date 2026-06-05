# 🎮 SKN Jugosławia - Setup & Testing Guide

## 📁 Struktura Projektu

```
agents-browser-game-design-plan/
├── index.html              # Strona logowania (refactored)
├── dashboard.html          # Panel główny gry (refactored)
├── theme.ogg              # Muzyka ambientna
├── README.md              # Dokumentacja
├── SETUP.md               # Ten plik
│
├── styles/                # 🎨 Wszystkie style CSS
│   ├── common.css         # Wspólne style (kolory, zmienne, buttony, etc.)
│   ├── login.css          # Style strony logowania
│   └── dashboard.css      # Style panelu głównego
│
└── js/                    # ⚙️ Logika JavaScript
    ├── auth.js            # Moduł autentykacji
    └── gameManager.js     # Logika turowa (do pobrania z session files)
```

## 🚀 Szybki Start

### 1️⃣ Setup Supabase Database

**A. Wklej SQL Schema:**
1. Otwórz Supabase Dashboard → SQL Editor
2. Skopiuj zawartość `supabase-schema.sql` z pliku sesji
3. Kliknij "Run"
4. Sprawdź czy nie ma błędów

**B. Weryfikacja:**
```sql
-- Sprawdź czy wszystkie tabele się stworzyły
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Sprawdź czy dane startowe się załadowały
SELECT * FROM state_global;
SELECT * FROM turns;
SELECT * FROM events WHERE turn_number = 1;
```

---

### 2️⃣ Testowanie Logowania

1. **Otwórz przeglądarkę** → http://localhost (lub na serwerze)
2. **Zaloguj się z danymi Supabase:**
   - Email: Jakikolwiek email z bazy Supabase Auth
   - Hasło: Hasło z Supabase
3. **Powinieneś dostać:**
   - ✅ Logowanie się powiodło
   - ➡️ Przekierowanie do dashboard.html

---

### 3️⃣ Testowanie Dashboard

**Co powinno działać:**

#### State Stats (4 stat-boxy)
- 📊 Wyświetla dane z `state_global`
- 🔴 Czerwone liczby = wartość < 30 (critical)
- 🟡 Żółte liczby = wartość < 50 (warning)

#### Player Profile (Dossier)
- 📋 Pokazuje alias, departament, agendę gracza
- Pobiera dane z tabeli `profiles`

#### Active Voting Event
- 🗳️ Wyświetla aktualny event ze statusem "voting"
- 📜 Pokazuje efekty w JSON
- ⏱️ Licznik głosów (YES/NO)
- 🔘 Przyciski "Głosuj ZA" i "Głosuj PRZECIW"

#### Tabs (Historia / Gracze)
- 📖 Historia zmian stanu gry
- 👥 Lista wszystkich aktywnych graczy

#### Logout
- 🚪 Wylogowuje i wraca do index.html

---

### 4️⃣ Testowanie Głosowania (Real-time)

**Symuluj kilka graczy:**

1. **Otwórz 2-3 okna przeglądarki**
2. **Zaloguj się na różne konta**
3. **Każdy gracz klika "Głosuj ZA" lub "PRZECIW"**
4. **Licznik powinien się aktualizować w REAL-TIME na wszystkich oknach** ✨

---

## 🔧 Struktura Kodu

### `index.html` (Logowanie)
- ✅ Wydzielony CSS (`common.css`, `login.css`)
- ✅ Moduł AuthManager z `js/auth.js`
- ✅ Komentarze wyjaśniające każdą sekcję
- ✅ Error handling i loading state

### `dashboard.html` (Gra)
- ✅ Wydzielony CSS (`common.css`, `dashboard.css`)
- ✅ Integracja z AuthManager
- ✅ Real-time subscriptions (Supabase)
- ✅ Dynamiczne ładowanie wszystkich danych
- ✅ Tab navigation (Historia / Gracze)

### `styles/common.css`
- Zmienne CSS (kolory, przejścia)
- Wspólne komponenty (buttony, formy, ikony)
- Responsywny design

### `js/auth.js`
- Klasa `AuthManager` z metodami:
  - `login(email, password)`
  - `logout()`
  - `checkSession()`
  - `getUser()`
  - `getProfile()`

---

## 🧪 Checklist Testowania

- [ ] Logowanie działa (zły email/hasło daje błąd)
- [ ] Zalogowany użytkownik widzi dashboard
- [ ] Stats wyświetlają się poprawnie
- [ ] Player profil ładuje dane z bazy
- [ ] Event wyświetla się z efektami
- [ ] Głosowanie się zapisuje w Supabase
- [ ] Licznik głosów aktualizuje się w real-time
- [ ] Tab navigation przełącza między Historia/Gracze
- [ ] Logout wraca do logowania
- [ ] Na małych ekranach (mobile) layout się nie psuje

---

## 📱 Responsywność

CSS ma breakpointy dla:
- 📱 Telefony: < 480px
- 📱 Tablety: < 768px
- 💻 Laptopy: < 1024px
- 🖥️ Desktop: > 1200px

---

## 🔗 Dalsze Kroki (FAZA 2)

### Co trzeba zrobić:
1. **GameManager integracja** - Stwóż turowy system (start/end turn)
2. **20+ Events** - Większy pool propozycji
3. **Balancing** - Tweak efektów żeby gra była fair
4. **Animations** - Pokazywanie zmian stanu
5. **Leaderboard** - Ranking graczy

---

## 🐛 Troubleshooting

### "Błąd przy logowaniu"
- ✅ Sprawdź czy hasło jest poprawne w Supabase
- ✅ Sprawdź czy konto jest potwierdzone (confirm email)
- ✅ Sprawdź czy email jest w Auth users (Supabase Dashboard)

### "No active event" / nie widać głosowania
- ✅ Sprawdź czy event istnieje w `events` tabeli
- ✅ Sprawdź czy `status` = 'voting' (nie 'pending')
- ✅ Sprawdź czy `turn_number` = 1

### "Stats nie updatują się"
- ✅ Sprawdź czy `state_global` ma `id = 1`
- ✅ Sprawdź wartości w Supabase (SELECT * FROM state_global)

### Real-time nie działa
- ✅ Sprawdź czy RLS policies są poprawne
- ✅ Sprawdź browser console na błędy WebSocket

---

## 📝 Notatki dla Developera

- **Supabase Credentials** są hardcoded w HTML (dla testu OK, dla produkcji trzeba env variables)
- **gameManager.js** czeka na integrację - jest gotowy w files/
- **CSS zmienne** - łatwo zmienić kolory w `:root` w common.css
- **Wszystkie ID dla state_global to `id = 1`** - jeden rekord dla całej gry

---

## ❓ Pytania?

Sprawdź:
1. Plan.md w session folder
2. Komentarze w HTML/JS (każda sekcja ma komentarze)
3. Console (F12) - będą loggedowane wszystkie kroki

**Powodzenia w rozwijaniu gry! 🚀**
