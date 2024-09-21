export default class LobbyManager {
    constructor() {
        this.lobbies = {}; // Holds all lobby information
    }

    // Create a new lobby
    createLobby(lobbyName, hostId) {
        if (!this.lobbies[lobbyName]) {
            this.lobbies[lobbyName] = {
                hostId: hostId,
                users: [hostId],
            };
            return true; // Lobby successfully created
        }
        return false; // Lobby already exists
    }

    // Request to join a lobby
    requestJoinLobby(lobbyName) {
        return this.lobbies[lobbyName] ? this.lobbies[lobbyName].hostId : null;
    }

    // Add a user to a lobby
    addUserToLobby(lobbyName, userId) {
        if (this.lobbies[lobbyName]) {
            this.lobbies[lobbyName].users.push(userId);
        }
    }

    // Handle disconnection and clean up
    handleDisconnect(userId) {
        for (let lobbyName in this.lobbies) {
            let lobby = this.lobbies[lobbyName];
            lobby.users = lobby.users.filter(id => id !== userId);
            if (lobby.hostId === userId) {
                delete this.lobbies[lobbyName]; // Close the lobby if host leaves
                return lobbyName;
            }
        }
        return null;
    }
}
