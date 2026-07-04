import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Phone,
  Video,
  MessageCircle,
  X,
  Send,
  Mic,
  MicOff,
  VideoOff,
  Copy,
  Check,
  Clock,
  AlertCircle,
  Lock,
  Monitor,
  MonitorOff,
  Calendar,
  User,
  Shield,
} from "lucide-react";
import Navbar from "../../Homepage/Navbar";
import Footer from "../../Homepage/footer";
import { io } from "socket.io-client";

const CallRoom = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get payment status and doctor info from route state
  const { doctor, slot, paid, patientName } = location.state || {};
  const doctorName = doctor?.name || "Dr. Arjun Mehta";
  const doctorSpecialty = doctor?.specialty || "Cardiology";
  const doctorInitial = (() => {
    const name = doctorName.replace(/^Dr\.?\s*/i, "");
    return (name[0] || "D").toUpperCase();
  })();

  // States
  const [callStatus, setCallStatus] = useState("waiting"); // waiting, calling, connected, ended
  const [callType, setCallType] = useState(null); // chat, voice, video
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "doctor",
      senderName: doctorName,
      text: "Hello! I'm ready to help you. How are you feeling today?",
      timestamp: new Date(Date.now() - 5000),
    },
  ]);
  const [messageInput, setMessageInput] = useState("");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef(null);
  const callTimerRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  // Patient info
  const mockPatient = {
    name: patientName || "Patient",
    avatar: "P",
  };

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Call timer
  useEffect(() => {
    if (callStatus === "connected") {
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(callTimerRef.current);
  }, [callStatus]);

  // Socket.IO setup and WebRTC signaling handlers
  useEffect(() => {
    const s = io(import.meta.env.VITE_BACKEND_URL || "");
    socketRef.current = s;
    s.emit("joinRoom", consultationId);

    s.on("message", ({ message }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          sender: "doctor",
          senderName: doctorName,
          text: message,
          timestamp: new Date(),
        },
      ]);
    });

    s.on("offer", async ({ offer }) => {
      if (!pcRef.current) await setupPeer(true);
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      s.emit("answer", { roomId: consultationId, answer });
    });

    s.on("answer", async ({ answer }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    s.on("ice-candidate", async ({ candidate }) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("ICE candidate error", e);
      }
    });

    return () => {
      s.disconnect();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [consultationId]);

  const setupPeer = async (withVideo = true) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302"] },
        { urls: ["stun:stun1.l.google.com:19302"] },
      ],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit("ice-candidate", {
          roomId: consultationId,
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === "connected" ||
        pc.iceConnectionState === "completed"
      ) {
        setCallStatus("connected");
      } else if (
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "failed"
      ) {
        setCallStatus("ended");
      }
    };

    pcRef.current = pc;

    // Get local media
    try {
      const constraints = withVideo
        ? { video: true, audio: true }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current && withVideo) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    } catch (e) {
      console.warn("getUserMedia error", e);
    }
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Send message
  const handleSendMessage = () => {
    if (messageInput.trim()) {
      const newMessage = {
        id: messages.length + 1,
        sender: "patient",
        senderName: "You",
        text: messageInput,
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
      setMessageInput("");
      socketRef.current?.emit("message", {
        roomId: consultationId,
        message: newMessage.text,
      });
    }
  };

  // Start call
  const startCall = async (type) => {
    setCallType(type);
    setCallStatus("calling");
    if (type !== "chat") {
      await setupPeer(type === "video");
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socketRef.current?.emit("offer", { roomId: consultationId, offer });
    }
    setCallStatus("connected");
  };

  // End call
  const endCall = () => {
    setCallStatus("ended");
    setCallType(null);
    setCallDuration(0);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    setIsScreenSharing(false);
  };

  // Toggle microphone — actually mutes the audio track
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
    setIsMicOn((prev) => !prev);
  }, []);

  // Toggle video — actually enables/disables the video track
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
    setIsVideoOn((prev) => !prev);
  }, []);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        screenStreamRef.current = screenStream;

        // Replace the video track in the peer connection
        const screenTrack = screenStream.getVideoTracks()[0];
        if (pcRef.current) {
          const sender = pcRef.current
            .getSenders()
            .find((s) => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }

        // Show screen in local video preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Auto-stop when user clicks browser's "Stop Sharing"
        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } catch (e) {
        console.warn("Screen sharing error", e);
      }
    } else {
      stopScreenShare();
    }
  }, [isScreenSharing]);

  const stopScreenShare = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());

    // Restore camera track
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    if (pcRef.current && cameraTrack) {
      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(cameraTrack);
      }
    }
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    setIsScreenSharing(false);
  }, []);

  // Copy consultation ID
  const copyConsultationId = () => {
    navigator.clipboard.writeText(consultationId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status badge config
  const statusConfig = {
    waiting: { label: "Waiting to Start", color: "bg-amber-100 text-amber-700 border-amber-200" },
    calling: { label: "Connecting...", color: "bg-blue-100 text-blue-700 border-blue-200" },
    connected: { label: "Live", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    ended: { label: "Call Ended", color: "bg-red-100 text-red-700 border-red-200" },
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-4 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Consultation Room
                </h1>
                <p className="text-sm text-slate-600 flex items-center gap-2 flex-wrap mt-1">
                  <span>ID: {consultationId}</span>
                  <button
                    onClick={copyConsultationId}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </>
                    )}
                  </button>
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Call status badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusConfig[callStatus].color}`}
                >
                  {callStatus === "connected" && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  {statusConfig[callStatus].label}
                </span>

                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="h-6 w-6 text-slate-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Call Area */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Appointment Info Card — shown in waiting state */}
              {callStatus === "waiting" && (
                <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-emerald-600" />
                    Appointment Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {doctorInitial}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Doctor</p>
                        <p className="font-semibold text-slate-900 text-sm">
                          {doctorName}
                        </p>
                        <p className="text-xs text-emerald-600">
                          {doctorSpecialty}
                        </p>
                      </div>
                    </div>

                    {slot && (
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Scheduled</p>
                          <p className="font-semibold text-slate-900 text-sm">
                            {slot}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500">Patient</p>
                        <p className="font-semibold text-slate-900 text-sm">
                          {mockPatient.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Video/Call Display */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl overflow-hidden aspect-video flex items-center justify-center relative group">
                {callStatus === "waiting" || callStatus === "calling" ? (
                  <div className="text-center text-white space-y-4 px-4">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-3xl font-bold mx-auto shadow-lg">
                      {doctorInitial}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{doctorName}</h2>
                      <p className="text-emerald-300">{doctorSpecialty}</p>
                    </div>
                    {callStatus === "calling" && (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-pulse h-3 w-3 rounded-full bg-emerald-500" />
                        <span>
                          {callType === "video"
                            ? "Starting video call..."
                            : "Connecting..."}
                        </span>
                      </div>
                    )}
                    {callStatus === "waiting" && (
                      <p className="text-sm text-slate-400 max-w-xs mx-auto">
                        Choose how you'd like to start the consultation below
                      </p>
                    )}
                  </div>
                ) : callStatus === "connected" ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    {callType === "video" ? (
                      <div className="w-full h-full flex relative">
                        {/* Remote Video */}
                        <video
                          ref={remoteVideoRef}
                          autoPlay
                          playsInline
                          className="flex-1 bg-black object-cover"
                        />
                        {/* Local Video (PiP) */}
                        <video
                          ref={localVideoRef}
                          autoPlay
                          muted
                          playsInline
                          className="absolute bottom-4 right-4 w-40 h-28 rounded-xl border-2 border-white shadow-lg bg-black object-cover"
                        />
                        {isScreenSharing && (
                          <div className="absolute top-4 left-4 bg-blue-600/80 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                            <Monitor className="h-3.5 w-3.5" />
                            Sharing Screen
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-white space-y-4">
                        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-4xl font-bold mx-auto">
                          {doctorInitial}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold">{doctorName}</h2>
                          <p className="text-emerald-300">{doctorSpecialty}</p>
                        </div>
                        <p className="text-lg font-semibold text-emerald-300">
                          {formatTime(callDuration)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-white space-y-4">
                    <div className="h-20 w-20 rounded-full bg-red-500/30 flex items-center justify-center text-5xl mx-auto">
                      ⊘
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Call Ended</h2>
                      <p className="text-emerald-300">
                        Duration: {formatTime(callDuration)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Call Duration Badge */}
                {callStatus === "connected" && (
                  <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {formatTime(callDuration)}
                  </div>
                )}

                {/* Online Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm font-semibold">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  Online
                </div>
              </div>

              {/* Controls — always visible */}
              <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
                {/* Active call controls */}
                {callStatus === "connected" && callType !== "chat" && (
                  <div className="flex items-center justify-center gap-4 flex-wrap mb-4">
                    {/* Mic toggle */}
                    <button
                      onClick={toggleMic}
                      className={`h-14 w-14 rounded-full flex items-center justify-center font-bold transition transform hover:scale-110 ${
                        isMicOn
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                      title={isMicOn ? "Mute Mic" : "Unmute Mic"}
                    >
                      {isMicOn ? (
                        <Mic className="h-6 w-6" />
                      ) : (
                        <MicOff className="h-6 w-6" />
                      )}
                    </button>

                    {/* Video toggle */}
                    {callType === "video" && (
                      <button
                        onClick={toggleVideo}
                        className={`h-14 w-14 rounded-full flex items-center justify-center font-bold transition transform hover:scale-110 ${
                          isVideoOn
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-red-600 text-white hover:bg-red-700"
                        }`}
                        title={isVideoOn ? "Stop Video" : "Start Video"}
                      >
                        {isVideoOn ? (
                          <Video className="h-6 w-6" />
                        ) : (
                          <VideoOff className="h-6 w-6" />
                        )}
                      </button>
                    )}

                    {/* Screen share toggle */}
                    {callType === "video" && (
                      <button
                        onClick={toggleScreenShare}
                        className={`h-14 w-14 rounded-full flex items-center justify-center font-bold transition transform hover:scale-110 ${
                          isScreenSharing
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                        title={
                          isScreenSharing ? "Stop Sharing" : "Share Screen"
                        }
                      >
                        {isScreenSharing ? (
                          <MonitorOff className="h-6 w-6" />
                        ) : (
                          <Monitor className="h-6 w-6" />
                        )}
                      </button>
                    )}

                    {/* End call */}
                    <button
                      onClick={endCall}
                      className="h-14 w-14 rounded-full bg-red-600 text-white flex items-center justify-center font-bold hover:bg-red-700 transition transform hover:scale-110"
                      title="End Call"
                    >
                      <Phone className="h-6 w-6" />
                    </button>
                  </div>
                )}

                {/* End call button for chat mode */}
                {callStatus === "connected" && callType === "chat" && (
                  <div className="flex justify-center mb-4">
                    <button
                      onClick={endCall}
                      className="h-14 w-14 rounded-full bg-red-600 text-white flex items-center justify-center font-bold hover:bg-red-700 transition transform hover:scale-110"
                      title="End Consultation"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                )}

                {/* Start call buttons — shown in waiting state */}
                {callStatus === "waiting" && (
                  <div className="flex gap-3 justify-center flex-wrap">
                    {!paid ? (
                      <div className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900">
                        <Lock className="h-5 w-5 flex-shrink-0" />
                        <span className="font-semibold text-sm">
                          Complete payment to start consultation
                        </span>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => startCall("chat")}
                          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-sm hover:shadow-md"
                        >
                          <MessageCircle className="h-5 w-5" /> Start Chat
                        </button>
                        <button
                          onClick={() => startCall("voice")}
                          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition shadow-sm hover:shadow-md"
                        >
                          <Phone className="h-5 w-5" /> Voice Call
                        </button>
                        <button
                          onClick={() => startCall("video")}
                          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition shadow-sm hover:shadow-md"
                        >
                          <Video className="h-5 w-5" /> Video Call
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Return to waiting */}
                {callStatus === "ended" && (
                  <div className="flex justify-center gap-3 flex-wrap">
                    <button
                      onClick={() => {
                        setCallStatus("waiting");
                        setCallDuration(0);
                        setCallType(null);
                      }}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                    >
                      <Phone className="h-5 w-5" /> Start New Call
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm flex flex-col h-full max-h-[600px] lg:max-h-[780px]">
                {/* Chat Header */}
                <div className="p-4 border-b border-emerald-100">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-emerald-600" />{" "}
                    Consultation Chat
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Messages with {doctorName}
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === "patient"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs rounded-2xl px-4 py-2.5 ${
                          msg.sender === "patient"
                            ? "bg-emerald-600 text-white rounded-br-none"
                            : "bg-slate-100 text-slate-900 rounded-bl-none"
                        }`}
                      >
                        {msg.sender === "doctor" && (
                          <p className="text-xs font-semibold mb-1 opacity-75">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="text-sm">{msg.text}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.sender === "patient"
                              ? "text-emerald-100"
                              : "text-slate-600"
                          }`}
                        >
                          {msg.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-emerald-100 space-y-3">
                  {callStatus === "ended" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2 text-sm text-amber-800">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <p>
                        This consultation has ended. You can review the chat
                        history.
                      </p>
                    </div>
                  )}

                  {!paid && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 text-sm text-red-800">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <p>
                        Payment is required to start chatting with the doctor.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleSendMessage()
                      }
                      disabled={callStatus === "ended" || !paid}
                      className="flex-1 px-3 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm disabled:opacity-50 disabled:bg-gray-100"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={
                        !messageInput.trim() ||
                        callStatus === "ended" ||
                        !paid
                      }
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:bg-gray-400"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CallRoom;
