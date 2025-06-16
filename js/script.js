document.addEventListener('DOMContentLoaded', () => {
    const brokerUrlInput = document.getElementById('brokerUrl');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const statusSpan = document.getElementById('status');

    // References to publish/subscribe topic inputs
    const publishTopicInput = document.getElementById('publishTopic');
    const subscribeTopicInput = document.getElementById('subscribeTopic');
    const subscribeBtn = document.getElementById('subscribeBtn'); // Keep this for manual subscription if desired, or remove if strictly auto

    // References to control buttons
    const recolherVaralBtn = document.getElementById('recolherVaralBtn');
    const estenderVaralBtn = document.getElementById('estenderVaralBtn');

    // Reference to the notification area
    const notificationMessages = document.getElementById('notificationMessages');
    
    // Updated: Reference to the varal status display with new ID
    const varalStatusH2 = document.getElementById('varalStatus');
    const varalStatusIcon = document.querySelector('.varal-status .icon');

    // Reference to the 'card small green' element for background change
    const varalStatusCard = document.querySelector('.small.green');

    // References for activity statistics
    const percentEstendidoSpan = document.getElementById('percentEstendido');
    const percentRecolhidoSpan = document.getElementById('percentRecolhido');
    const percentChuvaSpan = document.getElementById('percentChuva');
    const percentUmidadeSpan = document.getElementById('percentUmidade');
    const activityHistoryDiv = document.getElementById('activityHistory');

    let client = null;
    const client_id = 'DrySenseWebClient_' + Math.random().toString(16).substring(2, 8); // Unique client ID

    // GLOBAL VARIABLES: Variables to store activity counts
    let totalMessages = 0;
    let estendidoCount = 0;
    let recolhidoCount = 0;
    let chuvaCount = 0;
    let umidadeCount = 0;

    function updateConnectionStatus(isConnected) {
        if (isConnected) {
            statusSpan.textContent = 'Conectado';
            statusSpan.classList.remove('disconnected', 'error');
            statusSpan.classList.add('connected');
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
            recolherVaralBtn.disabled = false;
            estenderVaralBtn.disabled = false;
            subscribeBtn.disabled = true; // Disable manual subscribe button as it's now automatic
        } else {
            statusSpan.textContent = 'Desconectado';
            statusSpan.classList.remove('connected', 'error');
            statusSpan.classList.add('disconnected');
            connectBtn.disabled = false;
            disconnectBtn.disabled = true;
            recolherVaralBtn.disabled = true;
            estenderVaralBtn.disabled = true;
            subscribeBtn.disabled = false; // Enable manual subscribe button when disconnected
            updateVaralDisplay('Desativado');
            // Reset statistics when disconnected
            resetStatistics(); 
        }
    }

    // Function to add a notification message (now with full history)
    function addNotification(message) {
        const timestamp = new Date().toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const newNotification = document.createElement('p');
        newNotification.innerHTML = `<strong>${timestamp}:</strong> ${message}`;
        // Add new notifications at the top to show the latest first
        if (notificationMessages.firstChild) {
            notificationMessages.insertBefore(newNotification, notificationMessages.firstChild);
        } else {
            notificationMessages.appendChild(newNotification);
        }
        // REMOVED: No longer limiting the number of notifications to keep full history
        // The previous 'while' loop was removed to ensure all messages are kept.
    }

    // Function to update the varal status, icon, and specific card background color in the UI
    function updateVaralDisplay(status) {
        if (varalStatusH2) {
            varalStatusH2.textContent = status;
            let newCardBackgroundColor = '';

            if (varalStatusIcon) {
                if (status === 'Recolhido') {
                    varalStatusIcon.innerHTML = '&#x1F6B1;'; // Umbrella icon
                    newCardBackgroundColor = 'red'; // Changed to red as per your request
                } else if (status === 'Estendido') {
                    varalStatusIcon.innerHTML = '&#x1F455;'; // T-shirt icon
                    newCardBackgroundColor = 'blue'; // Changed to blue as per your request
                } else { // 'Desativado' or any unrecognized status
                    varalStatusIcon.innerHTML = '&#x26D4;'; // No entry sign icon
                    newCardBackgroundColor = 'black'; // Changed to black as per your request
                }

                // Apply the background color to the specific status card
                if (varalStatusCard) {
                    varalStatusCard.style.backgroundColor = newCardBackgroundColor;
                    varalStatusIcon.style.color = (status === 'Desativado') ? 'white' : '#555';
                }
            }
        }
    }

    // NEW/REINSTATED: Function to add activity to history and update statistics
    function addActivityToHistory(message, color = '#2196F3') { // Default color if not specified
        const timestamp = new Date().toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const newActivity = document.createElement('p');
        newActivity.innerHTML = `<span class="color-box" style="background-color: ${color};"></span> <strong>${timestamp}:</strong> ${message}`;

        // Add new activities at the top of the history
        if (activityHistoryDiv.firstChild) {
            activityHistoryDiv.insertBefore(newActivity, activityHistoryDiv.firstChild);
        } else {
            activityHistoryDiv.appendChild(newActivity);
        }

        // Limit the number of activities in history for readability (e.g., last 7)
        while (activityHistoryDiv.children.length > 7) {
            activityHistoryDiv.removeChild(activityHistoryDiv.lastChild);
        }
    }

    // Function to calculate and update percentages
    function updateStatistics() {
        if (totalMessages === 0) {
            percentEstendidoSpan.textContent = '0%';
            percentRecolhidoSpan.textContent = '0%';
            percentChuvaSpan.textContent = '0%';
            percentUmidadeSpan.textContent = '0%';
            return;
        }

        const estendidoPercent = ((estendidoCount / totalMessages) * 100).toFixed(1);
        const recolhidoPercent = ((recolhidoCount / totalMessages) * 100).toFixed(1);
        const chuvaPercent = ((chuvaCount / totalMessages) * 100).toFixed(1);
        const umidadePercent = ((umidadeCount / totalMessages) * 100).toFixed(1);

        percentEstendidoSpan.textContent = `${estendidoPercent}%`;
        percentRecolhidoSpan.textContent = `${recolhidoPercent}%`;
        percentChuvaSpan.textContent = `${chuvaPercent}%`;
        percentUmidadeSpan.textContent = `${umidadePercent}%`;
    }

    // Function to reset all statistics
    function resetStatistics() {
        totalMessages = 0;
        estendidoCount = 0;
        recolhidoCount = 0;
        chuvaCount = 0;
        umidadeCount = 0;
        updateStatistics(); // Update display to show 0%
        activityHistoryDiv.innerHTML = ''; // Clear activity history
    }


    connectBtn.addEventListener('click', () => {
        const brokerUrl = brokerUrlInput.value;
        const username = usernameInput.value;
        const password = passwordInput.value;

        const options = {
            clean: true, // Clean session
            connectTimeout: 4000,
            reconnectPeriod: 1000,
            clientId: client_id, // Use the generated client ID
        };

        if (username) {
            options.username = username;
        }
        if (password) {
            options.password = password;
        }

        try {
            client = mqtt.connect(brokerUrl, options);

            client.on('connect', () => {
                console.log('Conectado ao broker MQTT!');
                updateConnectionStatus(true);
                addNotification('Conectado ao broker MQTT.'); // Notify connection success
                // On successful connection, default to "Desativado" until a status is received
                updateVaralDisplay('Desativado');
                resetStatistics(); // Reset statistics on new connection

                // AUTOMATIC SUBSCRIPTION HERE
                const notificationTopic = subscribeTopicInput.value;
                if (notificationTopic) {
                    client.subscribe(notificationTopic, (err) => {
                        if (err) {
                            console.error('Erro ao assinar tópico de notificações automaticamente:', err);
                            addNotification(`Erro ao assinar tópico de notificações '${notificationTopic}': ${err.message}`);
                        } else {
                            console.log(`Assinado automaticamente com sucesso o tópico de notificações: ${notificationTopic}`);
                            addNotification(`Assinado automaticamente o tópico de notificações: '${notificationTopic}'`);
                        }
                    });
                }
            });

            client.on('error', (err) => {
                console.error('Erro na conexão MQTT:', err);
                statusSpan.textContent = 'Erro de Conexão';
                statusSpan.classList.add('error');
                updateConnectionStatus(false);
                addNotification(`Erro na conexão: ${err.message}`); // Notify connection error
                client.end(); // Close connection on severe error
            });

            client.on('close', () => {
                console.log('Conexão MQTT fechada.');
                updateConnectionStatus(false);
                addNotification('Conexão MQTT fechada.'); // Notify disconnection
            });

            client.on('message', (topic, message) => {
                const msg = message.toString();
                console.log(`Mensagem recebida no tópico "${topic}": ${msg}`);

                // Add all messages from the subscribed notification topic to the main notification area
                if (topic === subscribeTopicInput.value) {
                    addNotification(`Recebido em '${topic}': ${msg}`);

                    // Process messages for varal status and statistics
                    totalMessages++; // Increment total messages for statistics

                    if (msg.toLowerCase() === 'recolhido') {
                        updateVaralDisplay('Recolhido');
                        addActivityToHistory('Varal totalmente recolhido.', '#8BC34A'); // Green color for recolhido
                        recolhidoCount++;
                    } else if (msg.toLowerCase() === 'estendido') {
                        updateVaralDisplay('Estendido');
                        addActivityToHistory('Varal totalmente estendido.', '#2196F3'); // Blue color for estendido
                        estendidoCount++;
                    } else if (msg.toLowerCase().includes('chuva ativado')) { // Example: "sensor de chuva ativado"
                        addActivityToHistory('Sensor de chuva ativado.', '#2196F3'); // Blue color for chuva
                        chuvaCount++;
                    } else if (msg.toLowerCase().includes('umidade:')) { // Example: "umidade: 75%"
                        addActivityToHistory(`Nível de umidade: ${msg.split(':')[1].trim()}`, '#ADD8E6'); // Light blue for humidity
                        umidadeCount++;
                    } else if (msg.toLowerCase().includes('motor ligado, varal em recolhimento')) {
                        addActivityToHistory('Motor ligado, varal em recolhimento.', '#424242'); // Dark gray for motor activity
                    } else if (msg.toLowerCase().includes('dados enviados para o broker')) {
                        addActivityToHistory('Dados enviados para o broker.', '#FFFFFF'); // White for data sent
                    }
                    // You can add more 'else if' conditions for other specific messages you want to track

                    updateStatistics(); // Recalculate and update percentages after each relevant message
                }
            });

        } catch (e) {
            console.error('Erro ao tentar conectar:', e);
            statusSpan.textContent = 'URL do Broker Inválida';
            statusSpan.classList.add('error');
            updateConnectionStatus(false);
            addNotification(`Falha ao tentar conectar: ${e.message}`); // Notify connection attempt error
        }
    });

    disconnectBtn.addEventListener('click', () => {
        if (client) {
            client.end(() => {
                console.log('Desconectado do broker MQTT.');
                updateConnectionStatus(false);
            });
        }
    });

    // Event listener for "Recolher Varal" button
    recolherVaralBtn.addEventListener('click', () => {
        const topic = publishTopicInput.value;
        const message = 'recolher'; // Command to send

        if (client && client.connected && topic) {
            client.publish(topic, message, (err) => {
                if (err) {
                    console.error('Erro ao publicar mensagem "recolher":', err);
                    addNotification(`Erro ao enviar comando 'recolher': ${err.message}`);
                } else {
                    console.log(`Comando "recolher" enviado para o tópico "${topic}"`);
                    addNotification(`Comando 'recolher' enviado.`);
                }
            });
        } else {
            alert('Por favor, conecte-se ao broker antes de enviar comandos.');
        }
    });

    // Event listener for "Estender Varal" button
    estenderVaralBtn.addEventListener('click', () => {
        const topic = publishTopicInput.value;
        const message = 'estender'; // Command to send

        if (client && client.connected && topic) {
            client.publish(topic, message, (err) => {
                if (err) {
                    console.error('Erro ao publicar mensagem "estender":', err);
                    addNotification(`Erro ao enviar comando 'estender': ${err.message}`);
                } else {
                    console.log(`Comando "estender" enviado para o tópico "${topic}"`);
                    addNotification(`Comando 'estender' enviado.`);
                }
            });
        } else {
            alert('Por favor, conecte-se ao broker antes de enviar comandos.');
        }
    });

    updateConnectionStatus(false);
    updateVaralDisplay('Desativado'); 
    updateStatistics(); 
    activityHistoryDiv.innerHTML = ''; 
});