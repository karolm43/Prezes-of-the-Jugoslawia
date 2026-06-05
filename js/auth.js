// ============================================================================
// AUTHENTICATION MODULE
// Obsługuje logowanie, wylogowanie i sesje z Supabase
// ============================================================================

/**
 * AuthManager - Zarządzanie autentykacją z Supabase
 * 
 * Funkcje:
 * - login(email, password) - Zaloguj użytkownika
 * - logout() - Wyloguj użytkownika
 * - checkSession() - Sprawdź czy jest aktywna sesja
 * - getUser() - Pobierz aktualnego użytkownika
 * - getProfile() - Pobierz profil użytkownika
 * - isLoggedIn() - Sprawdź czy zalogowany
 */
class AuthManager {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentUser = null;
    }

    /**
     * Zaloguj użytkownika
     * @param {string} email - Email użytkownika
     * @param {string} password - Hasło
     * @returns {Promise<{user, error}>}
     */
    async login(email, password) {
        console.log('🔐 Logging in user:', email);

        const { data, error } = await this.supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error('❌ Login error:', error.message);
            return { user: null, error: error };
        }

        this.currentUser = data.user;
        console.log('✅ Logged in successfully');
        return { user: data.user, error: null };
    }

    /**
     * Wyloguj użytkownika
     * @returns {Promise<void>}
     */
    async logout() {
        console.log('👋 Logging out user...');
        
        const { error } = await this.supabase.auth.signOut();
        
        if (error) {
            console.error('❌ Logout error:', error);
            return;
        }

        this.currentUser = null;
        console.log('✅ Logged out successfully');
    }

    /**
     * Sprawdź aktualną sesję
     * @returns {Promise<{user, session, error}>}
     */
    async checkSession() {
        console.log('🔍 Checking session...');

        const { data: { session }, error } = await this.supabase.auth.getSession();

        if (error) {
            console.error('❌ Session check error:', error);
            return { user: null, session: null, error: error };
        }

        if (session) {
            this.currentUser = session.user;
            console.log('✅ Session found:', this.currentUser.email);
            return { user: session.user, session: session, error: null };
        }

        console.log('⚠️  No active session');
        return { user: null, session: null, error: null };
    }

    /**
     * Pobierz aktualnego użytkownika
     * @returns {Promise<{user, error}>}
     */
    async getUser() {
        const { data: { user }, error } = await this.supabase.auth.getUser();

        if (error) {
            console.error('❌ Error getting user:', error);
            return { user: null, error: error };
        }

        this.currentUser = user;
        return { user: user, error: null };
    }

    /**
     * Pobierz profil użytkownika z tabeli profiles
     * @returns {Promise<{profile, error}>}
     */
    async getProfile() {
        if (!this.currentUser) {
            console.error('❌ No user logged in');
            return { profile: null, error: new Error('No user') };
        }

        const { data, error } = await this.supabase
            .from('profiles')
            .select('id, alias, departament, agenda, role, influence_score')
            .eq('id', this.currentUser.id)
            .single();

        if (error) {
            console.error('❌ Error getting profile:', error);
            return { profile: null, error: error };
        }

        console.log('📋 Profile loaded:', data);
        return { profile: data, error: null };
    }

    /**
     * Sprawdź czy użytkownik jest zalogowany
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!this.currentUser;
    }

    /**
     * Pobierz ID aktualnego użytkownika
     * @returns {string|null}
     */
    getCurrentUserId() {
        return this.currentUser?.id || null;
    }

    /**
     * Pobierz email aktualnego użytkownika
     * @returns {string|null}
     */
    getCurrentUserEmail() {
        return this.currentUser?.email || null;
    }
}

// Export dla modułowego użytku
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
