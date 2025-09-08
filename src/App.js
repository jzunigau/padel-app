import React, { useState, useEffect } from "react";

// The password should match the one in the backend.
const ADMIN_PASSWORD = 'padel-admin-2025';

const App = () => {
  // Existing States
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchResult, setMatchResult] = useState({ score1: "", score2: "", winner: "" });
  const [activeTab, setActiveTab] = useState("players");
  const [selectedTeamPlayers, setSelectedTeamPlayers] = useState([]);

  // New Authentication States
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Cargar datos del backend al iniciar
  useEffect(() => {
    fetch('http://localhost:3001/api/data')
      .then(response => response.json())
      .then(data => {
        if (data) {
          setPlayers(data.players || []);
          setTeams(data.teams || []);
          setMatches(data.matches || []);
        }
      })
      .catch(error => console.error('Error al cargar los datos:', error))
      .finally(() => setIsInitialLoad(false));
  }, []);

  // Guardar datos en el backend cuando cambian
  useEffect(() => {
    if (isInitialLoad || !isAuthenticated) {
      return;
    }

    const dataToSave = {
      players,
      teams,
      matches,
    };

    fetch('http://localhost:3001/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': password,
      },
      body: JSON.stringify(dataToSave),
    })
    .then(response => {
        if (!response.ok) {
            console.error('Failed to save data. Status:', response.status);
            alert('Error: No se pudieron guardar los datos. Verifique la contraseña y la conexión con el servidor.');
        }
    })
    .catch(error => {
        console.error('Error al guardar los datos:', error);
        alert('Error: No se pudieron guardar los datos. Verifique la conexión con el servidor.');
    });
  }, [players, teams, matches, isAuthenticated, password, isInitialLoad]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Contraseña incorrecta");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
  };

  const addPlayer = () => {
    if (newPlayerName.trim() !== "" && !players.find(p => p.name === newPlayerName.trim())) {
      const newPlayer = {
        id: new Date().getTime(),
        name: newPlayerName.trim()
      };
      setPlayers([...players, newPlayer]);
      setNewPlayerName("");
    }
  };

  const removePlayer = (playerId) => {
    const updatedTeams = teams.filter(t => !t.playerIds.includes(playerId));
    setTeams(updatedTeams);
    
    const teamIdsToRemove = teams
      .filter(t => t.playerIds.includes(playerId))
      .map(t => t.id);
    
    const updatedMatches = matches.filter(m => 
      !teamIdsToRemove.includes(m.team1Id) && !teamIdsToRemove.includes(m.team2Id)
    );
    setMatches(updatedMatches);
    
    setPlayers(players.filter(p => p.id !== playerId));
  };

  const createTeam = () => {
    if (selectedTeamPlayers.length !== 2) {
      alert("Una pareja de pádel debe tener exactamente 2 jugadores");
      return;
    }

    const teamName = `${players.find(p => p.id === selectedTeamPlayers[0])?.name} & ${players.find(p => p.id === selectedTeamPlayers[1])?.name}`;
    
    if (teams.find(t => 
      (t.playerIds[0] === selectedTeamPlayers[0] && t.playerIds[1] === selectedTeamPlayers[1]) ||
      (t.playerIds[0] === selectedTeamPlayers[1] && t.playerIds[1] === selectedTeamPlayers[0])
    )) {
      alert("Esta pareja ya existe");
      return;
    }

    const newTeam = {
      id: new Date().getTime(),
      name: teamName,
      playerIds: [...selectedTeamPlayers],
      wins: 0,
      losses: 0,
      ties: 0, // Add ties to new team
      gamesWon: 0,
      gamesLost: 0
    };
    
    setTeams([...teams, newTeam]);
    setSelectedTeamPlayers([]);
  };

  const removeTeam = (teamId) => {
    const updatedMatches = matches.filter(m => m.team1Id !== teamId && m.team2Id !== teamId);
    setMatches(updatedMatches);
    
    setTeams(teams.filter(t => t.id !== teamId));
  };

  const generateMatches = () => {
    if (teams.length < 2) {
      alert("Necesitas al menos 2 parejas para generar partidos");
      return;
    }

    let matchIdCounter = new Date().getTime();
    const newMatches = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        newMatches.push({
          id: matchIdCounter++,
          team1Id: teams[i].id,
          team2Id: teams[j].id,
          team1Name: teams[i].name,
          team2Name: teams[j].name,
          score1: null,
          score2: null,
          winnerId: null,
          completed: false,
          date: new Date().toISOString().split('T')[0]
        });
      }
    }
    setMatches(newMatches);
    setActiveTab("matches");
  };

  const openMatchModal = (match) => {
    setSelectedMatch(match);
    setMatchResult({
      score1: match.score1 !== null ? match.score1 : "",
      score2: match.score2 !== null ? match.score2 : "",
      winner: match.winnerId || ""
    });
  };

  const closeMatchModal = () => {
    setSelectedMatch(null);
    setMatchResult({ score1: "", score2: "", winner: "" });
  };

  const saveMatchResult = () => {
    if (matchResult.score1 === "" || matchResult.score2 === "" || !matchResult.winner) {
      alert("Por favor, completa todos los campos");
      return;
    }

    const score1 = parseInt(matchResult.score1);
    const score2 = parseInt(matchResult.score2);
    const winner = matchResult.winner;

    if (isNaN(score1) || isNaN(score2)) {
      alert("Los puntajes deben ser números");
      return;
    }
    
    if (score1 < 0 || score2 < 0) {
      alert("El puntaje no puede ser un número negativo");
      return;
    }

    // Validation for ties
    if (winner === 'tie' && score1 !== score2) {
      alert("Para registrar un empate, los puntajes deben ser iguales.");
      return;
    }

    // Validation for a winner
    if (winner !== 'tie' && score1 === score2) {
      alert("No puede haber un empate si se selecciona un ganador.");
      return;
    }

    const updatedMatches = matches.map(match => {
      if (match.id === selectedMatch.id) {
        return {
          ...match,
          score1: score1,
          score2: score2,
          winnerId: winner === 'tie' ? 'tie' : parseInt(winner),
          completed: true
        };
      }
      return match;
    });

    const teamStats = {};
    
    teams.forEach(team => {
      teamStats[team.id] = {
        wins: 0,
        losses: 0,
        ties: 0,
        gamesWon: 0,
        gamesLost: 0
      };
    });

    updatedMatches.forEach(match => {
      if (match.completed) {
        const team1Stats = teamStats[match.team1Id];
        const team2Stats = teamStats[match.team2Id];
        
        if (team1Stats && team2Stats) {
          team1Stats.gamesWon += match.score1;
          team1Stats.gamesLost += match.score2;
          team2Stats.gamesWon += match.score2;
          team2Stats.gamesLost += match.score1;

          if (match.winnerId === match.team1Id) {
            team1Stats.wins += 1;
            team2Stats.losses += 1;
          } else if (match.winnerId === match.team2Id) {
            team2Stats.wins += 1;
            team1Stats.losses += 1;
          } else if (match.winnerId === 'tie') {
            team1Stats.ties += 1;
            team2Stats.ties += 1;
          }
        }
      }
    });

    const updatedTeams = teams.map(team => ({
      ...team,
      wins: teamStats[team.id]?.wins || 0,
      losses: teamStats[team.id]?.losses || 0,
      ties: teamStats[team.id]?.ties || 0,
      gamesWon: teamStats[team.id]?.gamesWon || 0,
      gamesLost: teamStats[team.id]?.gamesLost || 0
    }));

    setMatches(updatedMatches);
    setTeams(updatedTeams);
    closeMatchModal();
  };

  const getRanking = () => {
    return [...teams].sort((a, b) => {
      const winsA = a.wins || 0;
      const winsB = b.wins || 0;
      if (winsB !== winsA) return winsB - winsA;

      const lossesA = a.losses || 0;
      const lossesB = b.losses || 0;
      if (lossesA !== lossesB) return lossesA - lossesB; // Fewer losses is better
      
      const diffA = (a.gamesWon || 0) - (a.gamesLost || 0);
      const diffB = (b.gamesWon || 0) - (b.gamesLost || 0);
      return diffB - diffA;
    });
  };

  const getPendingMatches = () => {
    return matches.filter(match => !match.completed);
  };

  const getCompletedMatches = () => {
    return matches.filter(match => match.completed);
  };

  const ranking = getRanking();
  const pendingMatches = getPendingMatches();
  const completedMatches = getCompletedMatches();

  const togglePlayerSelection = (playerId) => {
    if (selectedTeamPlayers.includes(playerId)) {
      setSelectedTeamPlayers(selectedTeamPlayers.filter(id => id !== playerId));
    } else if (selectedTeamPlayers.length < 2) {
      setSelectedTeamPlayers([...selectedTeamPlayers, playerId]);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-6 relative">
            <h1 className="text-4xl font-bold text-center mb-2">PADEL AMIGOS S+40</h1>
            <p className="text-center text-green-100 text-lg">Sistema de gestión de partidos por parejas</p>
            
            <div className="absolute top-4 right-4">
              {!isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña de admin"
                    className="px-3 py-2 border border-gray-300 rounded-md text-black"
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  />
                  <button onClick={handleLogin} className="bg-white text-green-700 px-4 py-2 rounded-md font-bold hover:bg-green-100">
                    Login
                  </button>
                  {authError && <p className="text-red-300 text-sm absolute top-full right-0 mt-1">{authError}</p>}
                </div>
              ) : (
                <button onClick={handleLogout} className="bg-white text-red-500 px-4 py-2 rounded-md font-bold hover:bg-red-100">
                  Logout
                </button>
              )}
            </div>
          </div>

          <div className="border-b border-gray-200 bg-gray-50">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'players', label: 'JUGADORES' },
                { id: 'teams', label: 'PAREJAS' },
                { id: 'matches', label: 'PARTIDOS' },
                { id: 'ranking', label: 'RANKING' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-bold text-sm uppercase tracking-wider transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'border-green-600 text-green-700 bg-green-50'
                      : 'border-transparent text-gray-600 hover:text-green-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {activeTab === 'teams' && (
                <div>
                    {isAuthenticated && (
                      <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 mb-8">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">CREAR PAREJAS DE PÁDEL</h3>
                        <p className="text-center text-gray-600 text-lg mb-6">Selecciona exactamente 2 jugadores para formar una pareja.</p>
                        
                        {players.length < 2 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p className="text-xl">Necesitas al menos 2 jugadores para crear parejas.</p>
                          </div>
                        ) : (
                          <>
                            <div className="grid md:grid-cols-2 gap-4 mb-8">
                              {players.map(player => (
                                <div
                                  key={player.id}
                                  onClick={() => togglePlayerSelection(player.id)}
                                  className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 text-center text-lg font-bold ${
                                    selectedTeamPlayers.includes(player.id)
                                      ? 'border-green-500 bg-green-100 text-green-800 transform scale-105'
                                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-100'
                                  }`}
                                >
                                  {player.name}
                                </div>
                              ))}
                            </div>

                            <div className="text-center">
                              <p className="text-xl text-gray-700 mb-4">Jugadores seleccionados: {selectedTeamPlayers.length}/2</p>
                              {selectedTeamPlayers.length === 2 && (
                                <div className="mb-6 p-6 bg-green-100 border-2 border-green-300 rounded-xl">
                                  <p className="text-2xl font-bold text-green-800">
                                    {players.find(p => p.id === selectedTeamPlayers[0])?.name} & {players.find(p => p.id === selectedTeamPlayers[1])?.name}
                                  </p>
                                </div>
                              )}
                              <button
                                onClick={createTeam}
                                disabled={selectedTeamPlayers.length !== 2}
                                className={`px-10 py-4 rounded-xl font-bold text-xl transition-all duration-300 ${
                                  selectedTeamPlayers.length === 2
                                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                CREAR PAREJA
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {teams.length > 0 && (
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">PAREJAS REGISTRADAS ({teams.length})</h3>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {teams.map(team => {
                            const played = (team.wins || 0) + (team.losses || 0) + (team.ties || 0);
                            return (
                              <div key={team.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                                <div className="flex justify-between items-start mb-4">
                                  <h4 className="text-2xl font-bold text-gray-800">{team.name}</h4>
                                  {isAuthenticated && (
                                    <button
                                      onClick={() => removeTeam(team.id)}
                                      className="text-red-500 hover:text-red-700 transition-colors duration-200 bg-red-50 p-2 rounded-full hover:bg-red-100"
                                    >
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  )}
                                </div>
                                <div className="text-lg text-gray-700 space-y-2">
                                  <p>Partidos: <span className="font-bold">{played}</span></p>
                                  <p>Victorias: <span className="text-green-600 font-bold">{team.wins || 0}</span></p>
                                  <p>Derrotas: <span className="text-red-600 font-bold">{team.losses || 0}</span></p>
                                  <p>Empates: <span className="text-blue-600 font-bold">{team.ties || 0}</span></p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {isAuthenticated && teams.length >= 2 && (
                          <div className="mt-12 text-center">
                            <button
                              onClick={generateMatches}
                              className="bg-green-600 text-white px-12 py-4 rounded-xl hover:bg-green-700 transition-all duration-300 font-bold text-xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-1"
                            >
                              GENERAR PARTIDOS
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                </div>
            )}

            {activeTab === 'matches' && (
              <div className="space-y-8">
                <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">INFORMACIÓN DEL CAMPEONATO</h3>
                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-lg text-center"><p className="text-gray-600 text-lg font-semibold mb-2">JUGADORES</p><p className="text-4xl font-bold text-gray-800">{players.length}</p></div>
                    <div className="bg-white rounded-xl p-6 shadow-lg text-center"><p className="text-gray-600 text-lg font-semibold mb-2">PAREJAS</p><p className="text-4xl font-bold text-gray-800">{teams.length}</p></div>
                    <div className="bg-white rounded-xl p-6 shadow-lg text-center"><p className="text-gray-600 text-lg font-semibold mb-2">PARTIDOS TOTALES</p><p className="text-4xl font-bold text-gray-800">{matches.length}</p></div>
                    <div className="bg-white rounded-xl p-6 shadow-lg text-center"><p className="text-gray-600 text-lg font-semibold mb-2">PENDIENTES</p><p className="text-4xl font-bold text-gray-800">{pendingMatches.length}</p></div>
                  </div>
                </div>

                {pendingMatches.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">PARTIDOS PENDIENTES ({pendingMatches.length})</h3>
                    <div className="space-y-4">
                      {pendingMatches.map(match => (
                        <div key={match.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <p className="text-2xl font-bold text-gray-800">{match.team1Name} vs {match.team2Name}</p>
                              <p className="text-gray-600 text-lg">Fecha: {match.date}</p>
                            </div>
                            {isAuthenticated && (
                              <button
                                onClick={() => openMatchModal(match)}
                                className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                              >
                                REGISTRAR RESULTADO
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {completedMatches.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">PARTIDOS COMPLETADOS ({completedMatches.length})</h3>
                    <div className="space-y-4">
                      {completedMatches.map(match => {
                        const winner = match.winnerId === 'tie' ? { name: 'Empate' } : teams.find(t => t.id === match.winnerId);
                        return (
                          <div key={match.id} className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                <p className="text-2xl font-bold text-gray-800">{match.team1Name} {match.score1} - {match.score2} {match.team2Name}</p>
                                <p className="text-lg text-green-800 font-semibold">Ganador: {winner?.name || 'N/A'}</p>
                                <p className="text-gray-600">Fecha: {match.date}</p>
                              </div>
                              <span className="bg-green-600 text-white px-6 py-2 rounded-xl text-xl font-bold">COMPLETADO</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {matches.length === 0 && (
                  <div className="text-center py-16 text-gray-500">
                    <svg className="mx-auto h-16 w-16 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    <p className="text-2xl">No se han generado partidos</p>
                    <p className="text-xl mt-2">Crea parejas y genera los partidos para comenzar</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ranking' && (
              <div>
                <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 mb-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">CLASIFICACIÓN FINAL</h3>
                </div>

                {ranking.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <svg className="mx-auto h-16 w-16 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    <p className="text-2xl">No hay parejas en el ranking</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-8 py-6 text-left text-lg font-bold text-gray-800 uppercase tracking-wider">Posición</th>
                          <th className="px-8 py-6 text-left text-lg font-bold text-gray-800 uppercase tracking-wider">Pareja</th>
                          <th className="px-8 py-6 text-left text-lg font-bold text-gray-800 uppercase tracking-wider">PJ</th>
                          <th className="px-8 py-6 text-left text-lg font-bold text-gray-800 uppercase tracking-wider">V</th>
                          <th className="px-8 py-6 text-left text-lg font-bold text-gray-800 uppercase tracking-wider">D</th>
                          <th className="px-8 py-6 text-left text-lg font-bold text-gray-800 uppercase tracking-wider">E</th>
                          <th className="px-8 py-6 text-left text-lg font-bold text-gray-800 uppercase tracking-wider">Juegos Ganados</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {ranking.map((team, index) => {
                          const played = (team.wins || 0) + (team.losses || 0) + (team.ties || 0);
                          return (
                            <tr key={team.id} className={`transition-all duration-300 hover:bg-gray-50 ${
                              index === 0 ? 'bg-yellow-50 border-t-4 border-yellow-400' : ''
                            }`}>
                              <td className="px-8 py-6 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="text-2xl font-bold">{index + 1}º</span>
                                </div>
                              </td>
                              <td className="px-8 py-6 whitespace-nowrap text-2xl font-bold text-gray-800">{team.name}</td>
                              <td className="px-8 py-6 whitespace-nowrap text-2xl font-bold text-center">{played}</td>
                              <td className="px-8 py-6 whitespace-nowrap text-2xl font-bold text-center text-green-600">{team.wins || 0}</td>
                              <td className="px-8 py-6 whitespace-nowrap text-2xl font-bold text-center text-red-600">{team.losses || 0}</td>
                              <td className="px-8 py-6 whitespace-nowrap text-2xl font-bold text-center text-blue-600">{team.ties || 0}</td>
                              <td className="px-8 py-6 whitespace-nowrap text-2xl font-bold text-center">{team.gamesWon || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <footer className="text-center py-4">
          <p className="text-gray-400 text-sm">
            Desarrollado por Jorge Zuñiga Ulsen &copy; 2025
          </p>
        </footer>

        {isAuthenticated && selectedMatch && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">REGISTRAR RESULTADO</h3>
              <p className="text-xl text-gray-600 mb-6 text-center">{selectedMatch.team1Name} vs {selectedMatch.team2Name}</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-bold text-gray-700 mb-3">RESULTADO</label>
                  <div className="flex space-x-6">
                    <input type="number" value={matchResult.score1} onChange={(e) => setMatchResult({...matchResult, score1: e.target.value})} placeholder="0" min="0" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-center text-2xl" />
                    <input type="number" value={matchResult.score2} onChange={(e) => setMatchResult({...matchResult, score2: e.target.value})} placeholder="0" min="0" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-center text-2xl" />
                  </div>
                </div>

                <div>
                  <label className="block text-lg font-bold text-gray-700 mb-3">GANADOR</label>
                  <select value={matchResult.winner} onChange={(e) => setMatchResult({...matchResult, winner: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl">
                    <option value="">Selecciona ganador...</option>
                    <option value={selectedMatch.team1Id}>{selectedMatch.team1Name}</option>
                    <option value={selectedMatch.team2Id}>{selectedMatch.team2Name}</option>
                    <option value="tie">Empate</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-4 mt-8">
                <button onClick={closeMatchModal} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50">CANCELAR</button>
                <button onClick={saveMatchResult} className="flex-1 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700">GUARDAR</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;