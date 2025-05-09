let socket;
let peer;
let localStream;

function start() {
  const name = document.getElementById('name').value;
  const photoInput = document.getElementById('photo');
  const room = document.getElementById('room').value;

  if (!name || !photoInput.files[0]) {
    alert("Ad və şəkil daxil edin!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const profile = {
      name,
      photo: e.target.result
    };

    navigator.geolocation.getCurrentPosition(async pos => {
      const location = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude
      };

      document.getElementById('form').style.display = 'none';
      document.getElementById('chat').style.display = 'block';

      socket = io();
      socket.emit('join', { room, location, profile });

      socket.on('info', msg => document.getElementById('status').textContent = msg);
      socket.on('refresh', () => location.reload());

      socket.on('matched', peerProfile => {
        document.getElementById('status').textContent = 'Eşləşdi!';
        document.getElementById('peerName').textContent = peerProfile.name;
        document.getElementById('peerPhoto').src = peerProfile.photo;

        setupWebRTC();
      });

      socket.on('signal', async data => {
        if (data.sdp) {
          await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
          if (data.sdp.type === 'offer') {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit('signal', { sdp: answer });
          }
        } else if (data.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      });

      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      document.getElementById('localVideo').srcObject = localStream;
    });
  };
  reader.readAsDataURL(photoInput.files[0]);
}

function setupWebRTC() {
  peer = new RTCPeerConnection();
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

  peer.ontrack = e => {
    document.getElementById('remoteVideo').srcObject = e.streams[0];
  };

  peer.onicecandidate = e => {
    if (e.candidate) socket.emit('signal', { candidate: e.candidate });
  };

  peer.createOffer().then(offer => {
    peer.setLocalDescription(offer);
    socket.emit('signal', { sdp: offer });
  });
}

function next() {
  socket.emit('next');
}