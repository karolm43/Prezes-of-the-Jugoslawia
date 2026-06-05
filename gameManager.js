// ============================================================================
// GAME MANAGER - Główna logika turowego systemu głosowania
// Umieść ten plik jako: gameManager.js
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pswpuernfyfsijnscnwt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XUyqOs0SmAK4tezMYjdBDg_7l5S6bbb';

class GameManager {
    constructor() {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        this.currentTurn = null;
        this.currentEvent = null;
        this.gameState = null;
        this.players = [];
        this.subscriptions = [];
    }

    // ====== INITIALIZATION ======
    async init() {
        console.log('🎮 Initializing Game Manager...');
        await this.loadGameState();
        await this.loadPlayers();
        await this.startRealTimeUpdates();
        console.log('✅ Game Manager initialized');
    }

    // ====== STATE LOADING ======
    async loadGameState() {
        const { data, error } = await this.supabase
            .from('state_global')
            .select('*')
            .single();
        
        if (error) {
            console.error('❌ Error loading game state:', error);
            return null;
        }
        
        this.gameState = data;
        console.log('📊 Game state loaded:', data);
        return data;
    }

    async loadCurrentTurn() {
        const { data, error } = await this.supabase
            .from('turns')
            .select('*')
            .eq('status', 'active')
            .single();
        
        if (error) {
            console.log('No active turn, creating new one...');
            return await this.createNewTurn();
        }
        
        this.currentTurn = data;
        return data;
    }

    async loadCurrentEvent() {
        const { data, error } = await this.supabase
            .from('events')
            .select('*')
            .eq('status', 'voting')
            .single();
        
        if (error) {
            console.log('No active event');
            return null;
        }
        
        this.currentEvent = data;
        return data;
    }

    async loadPlayers() {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('id, alias, role, influence_score, departament')
            .eq('active', true);
        
        if (error) {
            console.error('❌ Error loading players:', error);
            return [];
        }
        
        this.players = data || [];
        console.log('👥 Players loaded:', this.players.length);
        return this.players;
    }

    // ====== TURN MANAGEMENT ======
    async createNewTurn() {
        console.log('🔄 Creating new turn...');
        
        const currentTurnNumber = this.gameState.turn_number || 0;
        const newTurnNumber = currentTurnNumber + 1;
        
        const { data, error } = await this.supabase
            .from('turns')
            .insert({
                turn_number: newTurnNumber,
                status: 'active',
                voting_deadline: new Date(Date.now() + 15 * 60000) // 15 min
            })
            .select()
            .single();
        
        if (error) {
            console.error('❌ Error creating turn:', error);
            return null;
        }
        
        this.currentTurn = data;
        await this.createTurnEvent(newTurnNumber);
        
        // Update global state
        await this.supabase
            .from('state_global')
            .update({ turn_number: newTurnNumber })
            .eq('id', 1);
        
        console.log('✅ New turn created:', newTurnNumber);
        return data;
    }

    async createTurnEvent(turnNumber) {
        // Select random event from predefined pool
        const eventPool = [
            {
                title: 'Defilada Majowa',
                description: 'Zorganizowanie ogólnokrajowej defilady podniesie nastroje społeczne.',
                category: 'social',
                effects: { reputation: 15, budget: -30000, social_morale: 20 }
            },
            {
                title: 'Program Edukacji',
                description: 'Inwestycja w edukację na poziomie narodowym.',
                category: 'social',
                effects: { education: 30, budget: -40000, social_morale: 10 }
            },
            {
                title: 'Digitalizacja',
                description: 'Przyspieszenie cyfryzacji infrastruktury.',
                category: 'tech',
                effects: { technology: 40, budget: -50000, economy: 15 }
            },
            {
                title: 'Zagraniczna Umowa Handlowa',
                description: 'Nowa umowa zwiększa eksport ale zmniejsza niezależność.',
                category: 'diplomatic',
                effects: { economy: 20, budget: 50000, political_influence: -10 }
            },
            {
                title: 'Program Zdrowotny',
                description: 'Modernizacja systemu opieki zdrowotnej kraju.',
                category: 'social',
                effects: { social_morale: 15, budget: -35000, stability: 5 }
            }
        ];
        
        const randomEvent = eventPool[Math.floor(Math.random() * eventPool.length)];
        
        const { data, error } = await this.supabase
            .from('events')
            .insert({
                turn_number: turnNumber,
                status: 'voting',
                ...randomEvent
            })
            .select()
            .single();
        
        if (error) {
            console.error('❌ Error creating event:', error);
            return null;
        }
        
        this.currentEvent = data;
        console.log('📋 Event created:', data.title);
        return data;
    }

    // ====== VOTING ======
    async submitVote(playerId, eventId, voteYes) {
        console.log(`🗳️  Player ${playerId} voting ${voteYes ? 'YES' : 'NO'} on event ${eventId}`);
        
        const { data, error } = await this.supabase
            .from('votes')
            .insert({
                turn_id: this.currentTurn.id,
                player_id: playerId,
                event_id: eventId,
                vote: voteYes
            })
            .select()
            .single();
        
        if (error) {
            if (error.code === '23505') {
                console.warn('⚠️  Player already voted on this event');
                // Update vote instead
                return await this.updateVote(playerId, eventId, voteYes);
            }
            console.error('❌ Error submitting vote:', error);
            return null;
        }
        
        // Update vote counters
        await this.updateEventVoteCounts(eventId);
        
        console.log('✅ Vote recorded');
        return data;
    }

    async updateVote(playerId, eventId, voteYes) {
        const { data, error } = await this.supabase
            .from('votes')
            .update({ vote: voteYes })
            .eq('player_id', playerId)
            .eq('event_id', eventId)
            .select()
            .single();
        
        if (error) {
            console.error('❌ Error updating vote:', error);
            return null;
        }
        
        await this.updateEventVoteCounts(eventId);
        return data;
    }

    async updateEventVoteCounts(eventId) {
        const { data: votes, error } = await this.supabase
            .from('votes')
            .select('vote')
            .eq('event_id', eventId);
        
        if (error) {
            console.error('❌ Error counting votes:', error);
            return;
        }
        
        const voteYes = votes.filter(v => v.vote === true).length;
        const voteNo = votes.filter(v => v.vote === false).length;
        
        await this.supabase
            .from('events')
            .update({ vote_yes: voteYes, vote_no: voteNo })
            .eq('id', eventId);
    }

    // ====== END VOTING & APPLY RESULTS ======
    async endVotingPhase() {
        console.log('🛑 Ending voting phase...');
        
        if (!this.currentEvent) {
            console.error('❌ No active event');
            return;
        }
        
        const eventId = this.currentEvent.id;
        
        // Get vote results
        const { data: votes, error } = await this.supabase
            .from('votes')
            .select('vote')
            .eq('event_id', eventId);
        
        if (error) {
            console.error('❌ Error getting vote results:', error);
            return;
        }
        
        const voteYes = votes.filter(v => v.vote === true).length;
        const voteNo = votes.filter(v => v.vote === false).length;
        const totalVotes = votes.length;
        
        console.log(`📊 Vote Results: YES: ${voteYes}, NO: ${voteNo}`);
        
        // Determine if event passes (majority)
        const passed = voteYes > voteNo;
        const status = passed ? 'passed' : 'failed';
        
        // Update event status
        await this.supabase
            .from('events')
            .update({ status: 'executed', voted_at: new Date() })
            .eq('id', eventId);
        
        if (passed) {
            // Apply effects to game state
            await this.applyEventEffects(this.currentEvent);
            console.log('✅ Event PASSED - effects applied');
        } else {
            console.log('❌ Event FAILED - no effects');
        }
        
        // Record in history
        await this.recordHistory(
            this.currentTurn.turn_number,
            eventId,
            'vote_result',
            `Event: ${this.currentEvent.title} - ${status.toUpperCase()}`
        );
        
        // Mark turn as completed
        await this.supabase
            .from('turns')
            .update({ status: 'completed', completed_at: new Date() })
            .eq('id', this.currentTurn.id);
        
        return { passed, voteYes, voteNo, totalVotes };
    }

    // ====== APPLY EFFECTS ======
    async applyEventEffects(event) {
        const effects = event.effects || {};
        
        // Build update object
        const updates = {};
        
        if (effects.budget) {
            updates.budget = this.gameState.budget + effects.budget;
        }
        if (effects.reputation) {
            updates.reputation = Math.max(0, Math.min(100, this.gameState.reputation + effects.reputation));
        }
        if (effects.social_morale) {
            updates.social_morale = Math.max(0, Math.min(100, this.gameState.social_morale + effects.social_morale));
        }
        if (effects.stability) {
            updates.stability = Math.max(0, Math.min(100, this.gameState.stability + effects.stability));
        }
        if (effects.infrastructure) {
            updates.infrastructure = Math.max(0, Math.min(100, this.gameState.infrastructure + effects.infrastructure));
        }
        if (effects.security) {
            updates.security = Math.max(0, Math.min(100, this.gameState.security + effects.security));
        }
        if (effects.education) {
            updates.education = Math.max(0, Math.min(100, this.gameState.education + effects.education));
        }
        if (effects.economy) {
            updates.economy = Math.max(0, Math.min(100, this.gameState.economy + effects.economy));
        }
        if (effects.technology) {
            updates.technology = Math.max(0, Math.min(100, this.gameState.technology + effects.technology));
        }
        
        updates.updated_at = new Date();
        
        const { error } = await this.supabase
            .from('state_global')
            .update(updates)
            .eq('id', 1);
        
        if (error) {
            console.error('❌ Error applying effects:', error);
            return;
        }
        
        this.gameState = { ...this.gameState, ...updates };
        console.log('✅ Game state updated:', updates);
    }

    // ====== HISTORY ======
    async recordHistory(turnNumber, eventId, changeType, description) {
        const { error } = await this.supabase
            .from('history')
            .insert({
                turn_number: turnNumber,
                event_id: eventId,
                change_type: changeType,
                before_state: this.gameState,
                after_state: this.gameState,
                description: description
            });
        
        if (error) {
            console.error('❌ Error recording history:', error);
        }
    }

    // ====== REAL-TIME UPDATES ======
    async startRealTimeUpdates() {
        console.log('🔌 Starting real-time subscriptions...');
        
        // Subscribe to vote updates
        if (this.currentEvent) {
            const voteSub = this.supabase
                .channel(`votes:${this.currentEvent.id}`)
                .on('postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'votes',
                        filter: `event_id=eq.${this.currentEvent.id}`
                    },
                    (payload) => {
                        console.log('🗳️  Vote update:', payload);
                        this.onVoteUpdate(payload);
                    }
                )
                .subscribe();
            
            this.subscriptions.push(voteSub);
        }
        
        // Subscribe to state updates
        const stateSub = this.supabase
            .channel('state_global')
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'state_global'
                },
                (payload) => {
                    console.log('📊 State update:', payload);
                    this.gameState = payload.new;
                    this.onStateUpdate(payload.new);
                }
            )
            .subscribe();
        
        this.subscriptions.push(stateSub);
    }

    // ====== CALLBACKS ======
    onVoteUpdate(payload) {
        // Trigger UI update
        window.dispatchEvent(new CustomEvent('gameVoteUpdate', { detail: payload }));
    }

    onStateUpdate(newState) {
        // Trigger UI update
        window.dispatchEvent(new CustomEvent('gameStateUpdate', { detail: newState }));
    }

    // ====== GETTERS ======
    getCurrentState() {
        return this.gameState;
    }

    getCurrentEvent() {
        return this.currentEvent;
    }

    getCurrentTurn() {
        return this.currentTurn;
    }

    getPlayers() {
        return this.players;
    }

    // ====== CLEANUP ======
    async cleanup() {
        console.log('🧹 Cleaning up subscriptions...');
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.subscriptions = [];
    }
}

// Export
export default GameManager;

// ============================================================================
// USAGE EXAMPLE
// ============================================================================
/*
import GameManager from './gameManager.js';

const game = new GameManager();

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await game.init();
    await game.loadCurrentTurn();
    await game.loadCurrentEvent();
    
    console.log('Game state:', game.getCurrentState());
    console.log('Current event:', game.getCurrentEvent());
    console.log('Players:', game.getPlayers());
});

// Listen for vote updates
window.addEventListener('gameVoteUpdate', (e) => {
    console.log('Vote updated:', e.detail);
    // Update UI vote counter
});

// Listen for state updates
window.addEventListener('gameStateUpdate', (e) => {
    console.log('Game state updated:', e.detail);
    // Update UI stats
});

// Submit vote
document.getElementById('vote-yes-btn').addEventListener('click', async () => {
    const userId = (await game.supabase.auth.getUser()).data.user.id;
    await game.submitVote(userId, game.currentEvent.id, true);
});

// End voting phase (admin only)
document.getElementById('end-voting-btn').addEventListener('click', async () => {
    const result = await game.endVotingPhase();
    console.log('Voting ended:', result);
    // Create next turn
    await game.createNewTurn();
});
*/
