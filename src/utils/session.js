const sessions = new Map();

/**
 * Get session by phone number
 */
function getSession(phone) {
    if (!sessions.has(phone)) {
        sessions.set(phone, {
            state: "PIN",
            data: {}
        });
    }
    return sessions.get(phone);
}

/**
 * Update session
 */
function saveSession(phone, session) {
    sessions.set(phone, session);
}

/**
 * Reset session
 */
function clearSession(phone) {
    sessions.delete(phone);
}

module.exports = {
    getSession,
    saveSession,
    clearSession
};
