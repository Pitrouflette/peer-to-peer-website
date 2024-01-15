const socket = io();
    const chatMessagesContainer = document.getElementById('chat-messages');
    const messageInput = document.getElementById('messageInput');
    let peerConnection;

    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('load messages from db', "");

      document.getElementById('initiateConnectionBtn').addEventListener('click', () => {
        if (document.getElementById('IDInput').value){
            console.log('Connecting...');
            initiateConnection(document.getElementById('IDInput').value);
        }
      });
      document.getElementById('userId').innerText = socket.id;
    });

    socket.on('offer', (offer, sourceSocketId) => {
      handleOffer(offer, sourceSocketId);
    });

    socket.on('answer', (answer, targetSocketId) => {
      handleAnswer(answer, targetSocketId);
    });

    socket.on('ice-candidate', (candidate, targetSocketId) => {
      handleIceCandidate(candidate, targetSocketId);
      console.log(peerConnection);
    });

    function initiateConnection(targetSocketId) {
        if (peerConnection && peerConnection.signalingState !== 'closed') {
            console.warn('La connexion existe déjà.');
            return;
        }

        const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
        const config = { iceServers: iceServers };
        peerConnection = peerConnection || new RTCPeerConnection(config);
        const dataChannel = peerConnection.createDataChannel('chat');
        setupDataChannel(dataChannel);

        peerConnection.onnegotiationneeded = () => {
            console.log('Negotiation needed...');
            console.log('Connection state before offer:', peerConnection.connectionState);
            peerConnection.createOffer()
                .then((offer) => peerConnection.setLocalDescription(offer))
                .then(() => {
                    console.log('Connection state after offer creation:', peerConnection.connectionState);
                    setTimeout(() => {
                        console.log('Local description set. Emitting offer...');
                        socket.emit('offer', peerConnection.localDescription, targetSocketId);
                        console.log("Offer sent!");
                    }, 1000);
                })
                .catch((error) => {
                    console.error('Erreur lors de la création de l\'offre:', error);
                    closeConnection();
                });
        };
        peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('ICE candidate:' + event.candidate);
            socket.emit('ice-candidate', event.candidate, targetSocketId);
        }
    };
        document.getElementById('userIdDisplay').innerHTML = `Your ID: ${socket.id}, Connected to: ${targetSocketId}`;
    }

    function closeConnection() {
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
    }

    function setupDataChannel(dataChannel) {
      dataChannel.onmessage = (event) => {
        displayMessage('Other User', event.data);
      };

      dataChannel.onopen = () => {
        console.log('Le canal de données est ouvert');
      };

      dataChannel.onclose = () => {
        console.log('Le canal de données est fermé');
      };
      console.log("conected !" + dataChannel.readyState.toString());
    }

    function handleOffer(offer, sourceSocketId) {
        console.log("Handling connection....");
        
        if (!peerConnection) {
            console.log("no peer connexion found, recreating one");
            initiateConnection();
        }

        if (peerConnection.signalingState === 'stable') {
            console.log("stable connection");
            peerConnection.setRemoteDescription(offer)
            .then(() => peerConnection.createAnswer())
            .then((answer) => peerConnection.setLocalDescription(answer))
            .then(() => {
                socket.emit('answer', peerConnection.localDescription);
                console.log("awnser sent !");
            })
            .catch((error) => {
                console.error('Error handling offer:', error);
            });
        } else {
            console.warn('The connection is not in a proper state to accept the offer currently.');
        }
        document.getElementById('userIdDisplay').innerHTML = `Your ID: ${socket.id}, Connected to: ${sourceSocketId}`;
    }


    function handleAnswer(answer) {
      peerConnection.setRemoteDescription(answer)
        .catch((error) => {
          console.error('Erreur lors de la gestion de la réponse:', error);
        });
    }

    function handleIceCandidate(candidate, targetSocketId) {
        if (peerConnection) {
        peerConnection.addIceCandidate(candidate)
            .catch((error) => {
                console.error('Erreur lors de la gestion du candidat ICE:', error);
            });
        } else {
            console.warn('Peer connection is undefined. Ice candidate not added.');
        }
    }

    function sendMessage() {
        console.log('sending message..');
        const message = messageInput.value.trim();
        let dataChannel;
        
        if (message !== '') {
            console.log('message verified');
            if(!peerConnection) {
                console.log("no peer conexion..");
                return;
            }
            
            if(!peerConnection.dataChannel) {
                console.log("no dataChannel.. creating a new one !");
                dataChannel = peerConnection.createDataChannel('chat');
                setupDataChannel(dataChannel);
                console.log("created ! " + dataChannel.readyState.toString());
            }else{
                dataChannel = peerConnection.dataChannel;
            }

            if(dataChannel.readyState != 'open'){
                console.log("not ready");
                return;
            }

            console.log('peer connection verified');
            dataChannel.send(message);
            displayMessage('You', message);
            messageInput.value = '';
            console.log('message sent !');

        }
    }
    function displayMessage(sender, message) {
      const chatMessages = document.createElement('div');
      chatMessages.innerHTML = `<strong>${sender}:</strong> ${message}`;
      chatMessagesContainer.appendChild(chatMessages);
      let data = {
        'sender': sender,
        'message': message.toString
      };
      socket.emit('save in DB', (data));
    }