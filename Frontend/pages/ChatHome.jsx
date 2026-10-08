import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ForumRounded from "@mui/icons-material/ForumRounded";
import GroupAddRounded from "@mui/icons-material/GroupAddRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import AddCircleOutlineRounded from "@mui/icons-material/AddCircleOutlineRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import MoodRounded from "@mui/icons-material/MoodRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import PhotoLibraryOutlined from "@mui/icons-material/PhotoLibraryOutlined";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import CallRounded from "@mui/icons-material/CallRounded";
import VideocamRounded from "@mui/icons-material/VideocamRounded";

function MessageTicks({ status }) {
  const isRead = status === "read";
  const isDelivered = status === "delivered" || isRead;
  return (
    <span
      className={`message-ticks${isRead ? " is-read" : ""}`}
      aria-label={`Message ${status || "sent"}`}
      title={`Message ${status || "sent"}`}
    >
      {isDelivered ? (
        <svg viewBox="0 0 20 14" aria-hidden="true">
          <path d="m1 7 4 4L14 2" />
          <path d="m7 10 2 1 9-9" />
        </svg>
      ) : (
        <svg viewBox="0 0 14 14" aria-hidden="true">
          <path d="m2 7 4 4 7-8" />
        </svg>
      )}
    </span>
  );
}

function ChatHome() {
  const navigate = useNavigate();
  const [currentUserId] = useState(() => {
    const token = localStorage.getItem("token");
    if (!token) return "";
    try {
      return String(jwtDecode(token).userId || "");
    } catch {
      return "";
    }
  });

  const [users, setusers] = useState([]);
  const [profileName] = useState(
    () => localStorage.getItem("profileName") || "My account",
  );
  const [unreadCounts, setUnreadCounts] = useState({});
  const [selecteduser, setselecteduser] = useState(null);
  const [messages, setmessages] = useState([]);
  const [newMessage, setnewMessage] = useState("");
  const [socket, setsocket] = useState(null);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [myProfileImage, setMyProfileImage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [messageActionError, setMessageActionError] = useState("");
  const [openMessageMenuId, setOpenMessageMenuId] = useState(null);
  const [callNotice, setCallNotice] = useState("");
  const [callSession, setCallSession] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    return `http://localhost:5001${imagePath}`;
  };

  const messagesEndRef = useRef(null);
  const documentInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callSessionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const selectedUserId = selecteduser?._id;
  const selectedUserIdRef = useRef(selectedUserId);
  selectedUserIdRef.current = selectedUserId;
  const userIdsKey = users.map((user) => user._id).join(",");
  const filteredContacts = users.filter((user) =>
    `${user.name} ${user.email}`
      .toLowerCase()
      .includes(contactQuery.trim().toLowerCase()),
  );
  const visibleUsers = users.filter((user) =>
    `${user.name} ${user.email}`
      .toLowerCase()
      .includes(contactSearch.trim().toLowerCase()),
  );
  const visibleMessages = messages.filter((message) =>
    String(message.message || "")
      .toLowerCase()
      .includes(messageSearch.trim().toLowerCase()),
  );

  const openChat = (user) => {
    setUnreadCounts((counts) => ({ ...counts, [user._id]: 0 }));
    setMessageSearch("");
    setCallNotice("");
    if (selecteduser?._id !== user._id) {
      setmessages([]);
      setselecteduser(user);
    }
    setContactPickerOpen(false);
    setContactQuery("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length, selectedUserId]);

  useEffect(() => {
    if (!contactPickerOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") setContactPickerOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [contactPickerOpen]);

  useEffect(() => {
    if (!userIdsKey) return undefined;
    let isActive = true;
    const token = localStorage.getItem("token");
    const loadUnreadCounts = async () => {
      const results = await Promise.allSettled(
        users.map(async (user) => {
          const response = await fetch(
            `http://localhost:5001/api/messages/${user._id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (!response.ok) throw new Error("Unable to load unread messages");
          const history = await response.json();
          const count = history.filter(
            (message) =>
              String(message.sender?._id || message.sender) ===
                String(user._id) && message.status !== "read",
          ).length;
          return [user._id, count];
        }),
      );
      if (!isActive) return;
      setUnreadCounts((current) => {
        const next = { ...current };
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            const [userId, count] = result.value;
            next[userId] =
              userId === String(selectedUserIdRef.current) ? 0 : count;
          }
        });
        return next;
      });
    };
    loadUnreadCounts();
    return () => {
      isActive = false;
    };
  }, [userIdsKey]);

  useEffect(() => {
    let isActive = true;
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5001/api/users", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        console.log("USERS DATA:", data);
        if (!response.ok) {
          console.log(data.message);
          return;
        }
        if (!isActive) return;
        setusers(data);
        setselecteduser((currentUser) =>
          currentUser
            ? data.find((user) => user._id === currentUser._id) || currentUser
            : currentUser,
        );
      } catch (error) {
        console.log(error);
      }
    };
    fetchUsers();
    const refreshInterval = window.setInterval(fetchUsers, 5000);
    window.addEventListener("focus", fetchUsers);
    return () => {
      isActive = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", fetchUsers);
    };
  }, []);

  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          "http://localhost:5001/api/users/profile",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          console.log(data.message);
          return;
        }

        setMyProfileImage(data.profileImage || "");
      } catch (error) {
        console.log(error);
      }
    };

    fetchMyProfile();
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:5001/api/messages/${selectedUserId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = await response.json();
        if (!response.ok) {
          console.log(data.message);
          return;
        }
        setmessages(data);
        setUnreadCounts((counts) => ({ ...counts, [selectedUserId]: 0 }));
        if (socket) {
          data.forEach((message) => {
            const senderId = String(message.sender?._id || message.sender);
            if (
              senderId === String(selectedUserId) &&
              message.status !== "read"
            ) {
              socket.emit("messageRead", { messageId: message._id });
            }
          });
        }
      } catch (error) {
        console.log(error);
      }
    };
    fetchMessages();
  }, [selectedUserId, socket]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("profileName");
    navigate("/");
  };

  const uploadProfileImage = async (fileToUpload = profileImage) => {
    if (!fileToUpload) return;

    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("profileImage", fileToUpload);

      const response = await fetch(
        "http://localhost:5001/api/users/profile-image",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.log(data.message);
        return;
      }

      setMyProfileImage(data.user.profileImage);
      setProfileImage(null);

      console.log("Profile image updated:", data.user.profileImage);
    } catch (error) {
      console.log(error);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      setMessageActionError("");
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5001/api/messages/${messageId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessageActionError(data.message || "Could not delete this message.");
        return false;
      }

      setmessages((prevMessages) =>
        prevMessages.filter((msg) => String(msg._id) !== String(messageId)),
      );
      return true;
    } catch {
      setMessageActionError("Could not delete this message. Check your connection and try again.");
      return false;
    }
  };

  const editMessage = async (messageId, newText) => {
    try {
      setMessageActionError("");
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5001/api/messages/${messageId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: newText,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessageActionError(data.message || "Could not edit this message.");
        return false;
      }

      setmessages((prevMessages) =>
        prevMessages.map((msg) =>
          String(msg._id) === String(messageId)
            ? { ...msg, ...data.data, replyTo: msg.replyTo }
            : msg,
        ),
      );
      return true;
    } catch {
      setMessageActionError("Could not edit this message. Check your connection and try again.");
      return false;
    }
  };

  const sendMessage = async () => {
    if (!selecteduser || !newMessage.trim() || !socket) {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5001/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: selecteduser._id,
          message: newMessage,
          replyTo: replyingTo?._id || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.log(data.message);
        return;
      }
      setmessages((prevMessages) => [...prevMessages, data.data]);
      setnewMessage("");
      setReplyingTo(null);
    } catch (error) {
      console.log(error);
    }
  };

  const getCallName = (userId) =>
    users.find((user) => String(user._id) === String(userId))?.name ||
    (String(selecteduser?._id) === String(userId) ? selecteduser.name : "Contact");

  const setActiveCall = (nextCall) => {
    callSessionRef.current = nextCall;
    setCallSession(nextCall);
  };

  const cleanupCall = () => {
    const peerConnection = peerConnectionRef.current;
    peerConnectionRef.current = null;
    peerConnection?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    pendingIceCandidatesRef.current = [];
    setActiveCall(null);
  };

  const endCall = (notifyPeer = false, eventName = "call:end") => {
    const activeCall = callSessionRef.current;
    if (notifyPeer && activeCall && socket) {
      socket.emit(eventName, {
        toUserId: activeCall.peerUserId,
        callId: activeCall.callId,
      });
    }
    cleanupCall();
  };

  const flushIceCandidates = async (peerConnection) => {
    const queuedCandidates = pendingIceCandidatesRef.current;
    pendingIceCandidatesRef.current = [];
    for (const candidate of queuedCandidates) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const createPeerConnection = (activeCall, stream) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnectionRef.current = peerConnection;
    stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit("call:ice-candidate", {
          toUserId: activeCall.peerUserId,
          callId: activeCall.callId,
          candidate: event.candidate,
        });
      }
    };
    peerConnection.ontrack = (event) => {
      setRemoteStream((currentStream) => {
        const streamToUse = currentStream || new MediaStream();
        if (!streamToUse.getTracks().some((track) => track.id === event.track.id)) {
          streamToUse.addTrack(event.track);
        }
        return streamToUse;
      });
    };
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        const currentCall = callSessionRef.current;
        if (currentCall?.callId === activeCall.callId) {
          setActiveCall({ ...currentCall, status: "connected" });
        }
      } else if (["failed", "closed"].includes(peerConnection.connectionState)) {
        if (callSessionRef.current?.callId === activeCall.callId) cleanupCall();
      }
    };
    return peerConnection;
  };

  const startCall = async (callType) => {
    if (!selecteduser || !socket?.connected || callSessionRef.current) {
      setCallNotice("You can start a call when connected to the chat server and no other call is active.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCallNotice("This browser doesn’t support camera or microphone access.");
      return;
    }
    try {
      setCallNotice("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const activeCall = {
        callId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        peerUserId: String(selecteduser._id),
        peerName: selecteduser.name,
        callType,
        status: "calling",
        isCaller: true,
      };
      setActiveCall(activeCall);
      const peerConnection = createPeerConnection(activeCall, stream);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit("call:offer", {
        toUserId: activeCall.peerUserId,
        callId: activeCall.callId,
        callType,
        offer: peerConnection.localDescription,
      });
    } catch (error) {
      cleanupCall();
      setCallNotice(error.name === "NotAllowedError"
        ? "Allow camera and microphone access to start a call."
        : "Could not start the call. Check your camera and microphone.");
    }
  };

  const acceptCall = async () => {
    const activeCall = callSessionRef.current;
    if (!activeCall?.offer) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: activeCall.callType === "video",
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const peerConnection = createPeerConnection(activeCall, stream);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(activeCall.offer));
      await flushIceCandidates(peerConnection);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("call:answer", {
        toUserId: activeCall.peerUserId,
        callId: activeCall.callId,
        answer: peerConnection.localDescription,
      });
      setActiveCall({ ...activeCall, status: "connecting", offer: null });
    } catch (error) {
      endCall(true, "call:reject");
      setCallNotice(error.name === "NotAllowedError"
        ? "Allow camera and microphone access to answer the call."
        : "Could not answer the call.");
    }
  };

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [localStream, remoteStream, callSession]);

  useEffect(() => {
    if (!callSession || callSession.status !== "calling") return undefined;
    const callId = callSession.callId;
    const timeoutId = window.setTimeout(() => {
      if (callSessionRef.current?.callId !== callId) return;
      endCall(true);
      setCallNotice("No answer. You can try calling again.");
    }, 35000);
    return () => window.clearTimeout(timeoutId);
  }, [callSession]);

  useEffect(() => {
    if (!socket) return undefined;
    const onIncomingCall = (data) => {
      if (callSessionRef.current) {
        socket.emit("call:reject", {
          toUserId: data.fromUserId,
          callId: data.callId,
        });
        return;
      }
      setCallNotice("");
      setActiveCall({
        callId: data.callId,
        peerUserId: String(data.fromUserId),
        peerName: getCallName(data.fromUserId),
        callType: data.callType,
        status: "incoming",
        isCaller: false,
        offer: data.offer,
      });
    };
    const onCallAnswered = async (data) => {
      const activeCall = callSessionRef.current;
      const peerConnection = peerConnectionRef.current;
      if (!activeCall || activeCall.callId !== data.callId || !peerConnection) return;
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        await flushIceCandidates(peerConnection);
        setActiveCall({ ...activeCall, status: "connecting" });
      } catch {
        setCallNotice("Could not connect the call.");
        endCall(true);
      }
    };
    const onIceCandidate = async (data) => {
      const activeCall = callSessionRef.current;
      const peerConnection = peerConnectionRef.current;
      if (!activeCall || activeCall.callId !== data.callId || !data.candidate) return;
      if (!peerConnection?.remoteDescription) {
        pendingIceCandidatesRef.current.push(data.candidate);
        return;
      }
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {
        // Ignore stale ICE candidates after a call has already ended.
      }
    };
    const onCallRejected = (data) => {
      if (callSessionRef.current?.callId !== data.callId) return;
      const peerName = callSessionRef.current.peerName;
      cleanupCall();
      setCallNotice(`${peerName || "Contact"} declined the call.`);
    };
    const onCallEnded = (data) => {
      if (callSessionRef.current?.callId === data.callId) cleanupCall();
    };
    const onCallUnavailable = (data) => {
      if (callSessionRef.current?.callId !== data.callId) return;
      cleanupCall();
      setCallNotice("That person is offline and can’t receive a call right now.");
    };
    socket.on("call:incoming", onIncomingCall);
    socket.on("call:answered", onCallAnswered);
    socket.on("call:ice-candidate", onIceCandidate);
    socket.on("call:rejected", onCallRejected);
    socket.on("call:ended", onCallEnded);
    socket.on("call:unavailable", onCallUnavailable);
    return () => {
      socket.off("call:incoming", onIncomingCall);
      socket.off("call:answered", onCallAnswered);
      socket.off("call:ice-candidate", onIceCandidate);
      socket.off("call:rejected", onCallRejected);
      socket.off("call:ended", onCallEnded);
      socket.off("call:unavailable", onCallUnavailable);
    };
  }, [socket, users, selecteduser]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const decoded = jwtDecode(token);
    const newSocket = io("http://localhost:5001", {
      auth: { token },
    });
    setsocket(newSocket);

    newSocket.on("connect", () => {
      newSocket.emit("register", decoded.userId);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("receiveMessage", (data) => {
      socket.emit("messageDelivered", { messageId: data._id });
      const senderId = String(data.sender?._id || data.sender);
      if (senderId !== String(selectedUserId)) {
        setUnreadCounts((counts) => ({
          ...counts,
          [senderId]: (counts[senderId] || 0) + 1,
        }));
        return;
      }

      setUnreadCounts((counts) => ({ ...counts, [senderId]: 0 }));
      socket.emit("messageRead", { messageId: data._id });
      setmessages((prevMessages) => [...prevMessages, data]);
    });

    socket.on("messageDeleted", (data) => {
      setmessages((prevMessages) =>
        prevMessages.filter((msg) => msg._id !== data.messageId),
      );
    });

    socket.on("messageEdited", (data) => {
      setmessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === data.messageId ? { ...msg, message: data.message } : msg,
        ),
      );
    });

    socket.on("messageStatusUpdated", (data) => {
      setmessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id.toString() === data.messageId.toString()
            ? { ...msg, status: data.status }
            : msg,
        ),
      );
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("messageStatusUpdated");
    };
  }, [socket, selectedUserId]);

  return (
    <div className="chat-page w-full font-sans">
      <div className="chat-window relative z-10">
        <header className="app-topbar">
          <div className="app-brand">
            <span className="app-brand-mark">
              <ForumRounded />
            </span>
            <span>Connect</span>
          </div>
          <label className="app-search-wrap">
            <SearchRounded fontSize="small" />
            <input
              type="search"
              placeholder="Search messages..."
              value={messageSearch}
              onChange={(event) => setMessageSearch(event.target.value)}
              aria-label="Search messages in this chat"
            />
          </label>
          <div className="app-user">
            <input
              type="file"
              accept="image/*"
              id="profile-image-input"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files[0];

                if (file) {
                  setProfileImage(file);
                  uploadProfileImage(file);
                }

                e.target.value = "";
              }}
            />
            <Avatar
              className="app-user-avatar"
              title="Change profile picture"
              aria-label="Change profile picture"
              onClick={() => {
                document.getElementById("profile-image-input").click();
              }}
            >
              {myProfileImage ? (
                <img
                  src={`${getImageUrl(myProfileImage)}?t=${Date.now()}`}
                  alt="My profile"
                />
              ) : (
                profileName.trim().charAt(0).toUpperCase() || "M"
              )}
            </Avatar>
            <span>My account</span>
          </div>
        </header>
        <div
          className={`chat-workspace${selecteduser ? " has-selected-chat" : ""}`}
        >
          <nav className="chat-rail" aria-label="Main navigation">
            <Tooltip title="Chats" placement="right">
              <IconButton className="rail-button is-active" aria-label="Chats">
                <ForumRounded />
              </IconButton>
            </Tooltip>
            <Tooltip title="Find people" placement="right">
              <IconButton
                className="rail-button"
                aria-label="Find people"
                onClick={() => setContactPickerOpen(true)}
              >
                <GroupAddRounded />
              </IconButton>
            </Tooltip>
            <Tooltip title="Sign out" placement="right">
              <IconButton
                className="rail-signout"
                aria-label="Sign out"
                onClick={logout}
              >
                <LogoutRounded />
              </IconButton>
            </Tooltip>
          </nav>

          {/* LEFT PANE - Sidebar */}
          <aside className="chat-sidebar flex flex-col h-full flex-shrink-0">
            <div className="contacts-top">
              <div className="contacts-heading">
                <h1>Chat</h1>
              </div>
              <Button
                className="new-chat-button mb-3"
                variant="outlined"
                startIcon={<EditRounded />}
                onClick={() => setContactPickerOpen(true)}
              >
                Start a new chat
              </Button>
              <label className="contacts-search-wrap">
                <SearchRounded fontSize="small" />
                <input
                  type="search"
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(event) => setContactSearch(event.target.value)}
                  aria-label="Search contacts"
                />
              </label>
            </div>

            <div className="chat-contact-list flex-1 overflow-y-auto">
              {visibleUsers.map((user) => (
                <div
                  key={user._id}
                  onClick={() => openChat(user)}
                  className={`chat-contact-item flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                    selecteduser?._id === user._id
                      ? "chat-contact-active"
                      : "chat-contact-hover"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="contact-avatar w-10 h-10 rounded-full flex items-center justify-center font-medium">
                      {user.profileImage ? (
                        <img src={getImageUrl(user.profileImage)} alt="" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </Avatar>
                    {user.isOnline && (
                      <span className="contact-status-dot"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium text-[15px] truncate">
                        {user.name}
                      </h3>
                      {unreadCounts[user._id] > 0 && (
                        <span
                          className="contact-unread-badge"
                          aria-label={`${unreadCounts[user._id]} unread messages`}
                          title={`${unreadCounts[user._id]} unread messages`}
                        >
                          {unreadCounts[user._id] > 99
                            ? "99+"
                            : unreadCounts[user._id]}
                        </span>
                      )}
                    </div>
                    <p className="contact-email text-[13px] truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              ))}
              {!visibleUsers.length && (
                <p className="no-contacts">No contacts found.</p>
              )}
            </div>
          </aside>

          {/* MIDDLE PANE - Chat Area */}
          <main className="chat-main flex-1 flex flex-col h-full relative">
            {selecteduser ? (
              <>
                {/* Header */}
                <header className="chat-header flex justify-between items-center px-6 py-4">
                  <IconButton
                    className="chat-back-button"
                    aria-label="Back to chats"
                    onClick={() => {
                      setMessageSearch("");
                      setselecteduser(null);
                    }}
                  >
                    <ArrowBackRounded />
                  </IconButton>
                  <div className="chat-header-person flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="contact-avatar w-10 h-10 rounded-full flex items-center justify-center font-medium">
                        {selecteduser.profileImage ? (
                          <img
                            src={getImageUrl(selecteduser.profileImage)}
                            alt=""
                          />
                        ) : (
                          selecteduser.name.charAt(0).toUpperCase()
                        )}
                      </Avatar>
                      {selecteduser.isOnline && (
                        <span className="contact-status-dot"></span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-[16px] font-medium leading-tight">
                        {selecteduser.name}
                      </h2>
                      <p
                        className={`chat-presence ${selecteduser.isOnline ? "online" : ""}`}
                      >
                        {selecteduser.isOnline ? "Online now" : "Offline"}
                      </p>
                    </div>
                  </div>
                  <div className="chat-call-actions" aria-label="Call options">
                    <Tooltip title="Voice call">
                      <IconButton
                        className="chat-call-button"
                        aria-label={`Start voice call with ${selecteduser.name}`}
                        onClick={() => startCall("audio")}
                      >
                        <CallRounded />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Video call">
                      <IconButton
                        className="chat-call-button"
                        aria-label={`Start video call with ${selecteduser.name}`}
                        onClick={() => startCall("video")}
                      >
                        <VideocamRounded />
                      </IconButton>
                    </Tooltip>
                  </div>
                </header>
                {callNotice && (
                  <div className="call-notice" role="status">
                    <span>{callNotice}</span>
                    <button type="button" onClick={() => setCallNotice("")} aria-label="Dismiss call message">×</button>
                  </div>
                )}

                {/* Messages */}
                <div className="chat-messages flex-1 overflow-y-auto px-6 py-4">
                  <div className="chat-message-stack">
                    {messages.length === 0 && !messageSearch.trim() && (
                      <div className="empty-messages text-center text-sm mt-10">
                        Kuch Boliye!
                      </div>
                    )}
                    {messageSearch.trim() && visibleMessages.length === 0 && (
                      <div className="empty-messages text-center text-sm mt-10">
                        No messages match “{messageSearch.trim()}”.
                      </div>
                    )}

                    {visibleMessages.map((msg, index) => {
                      const senderId = String(msg.sender?._id || msg.sender);
                      const previousSenderId = String(
                        visibleMessages[index - 1]?.sender?._id ||
                          visibleMessages[index - 1]?.sender,
                      );
                      const isSentByMe = senderId === currentUserId;
                      const showAvatar =
                        !isSentByMe &&
                        (index === 0 || previousSenderId !== senderId);

                      return (
                        <div
                          key={msg._id || index}
                          className={`flex ${isSentByMe ? "justify-end" : "justify-start"} group`}
                        >
                          {!isSentByMe && (
                            <div className="w-7 h-7 flex-shrink-0 mr-2 self-end mb-1">
                              {showAvatar && (
                                <div className="contact-avatar w-full h-full rounded-full flex items-center justify-center text-[10px] font-medium">
                                  {selecteduser.profileImage ? (
                                    <img
                                      src={getImageUrl(
                                        selecteduser.profileImage,
                                      )}
                                      alt=""
                                    />
                                  ) : (
                                    selecteduser.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            className={`max-w-[70%] ${
                              isSentByMe
                                ? "chat-bubble-outgoing rounded-[18px] px-3.5 py-2"
                                : "chat-bubble-incoming rounded-[18px] px-3.5 py-2"
                            }`}
                          >
                            {msg.replyTo && (
  <div className="message-reply-preview">
    <strong>Replying to</strong>
    <p>{msg.replyTo.message}</p>
  </div>
)}
                            {editingMessageId === msg._id ? (
                              <div className="edit-message-box">
                                <input
                                  type="text"
                                  value={editingText}
                                  onChange={(e) =>
                                    setEditingText(e.target.value)
                                  }
                                  autoFocus
                                />

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!editingText.trim()) return;
                                    const saved = await editMessage(msg._id, editingText);
                                    if (saved) {
                                      setEditingMessageId(null);
                                      setEditingText("");
                                    }
                                  }}
                                >
                                  Save
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMessageId(null);
                                    setEditingText("");
                                    setMessageActionError("");
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <p className="text-[15px] leading-[1.3] font-normal">
                                {msg.message}
                              </p>
                            )}
                            <div className="message-actions">
                              <button
                                type="button"
                                className="message-menu-trigger"
                                aria-label="Message actions"
                                aria-haspopup="menu"
                                aria-expanded={openMessageMenuId === msg._id}
                                onClick={() =>
                                  setOpenMessageMenuId((current) =>
                                    current === msg._id ? null : msg._id,
                                  )
                                }
                              >
                                <KeyboardArrowDownRounded fontSize="small" />
                              </button>
                              {openMessageMenuId === msg._id && (
                                <div className="message-action-menu" role="menu">
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setReplyingTo(msg);
                                      setOpenMessageMenuId(null);
                                    }}
                                  >
                                    Reply
                                  </button>
                                  {isSentByMe && (
                                    <>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                          setMessageActionError("");
                                          setEditingMessageId(msg._id);
                                          setEditingText(msg.message);
                                          setOpenMessageMenuId(null);
                                        }}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                          setOpenMessageMenuId(null);
                                          deleteMessage(msg._id);
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            {isSentByMe && messageActionError && (
                              <p className="message-action-error" role="alert">
                                {messageActionError}
                              </p>
                            )}
                            {isSentByMe && (
                              <div className="message-meta">
                                <MessageTicks status={msg.status} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} aria-hidden="true" />
                  </div>
                </div>

                {/* Input Area */}
                {replyingTo && (
                  <div className="reply-preview">
                    <div>
                      <strong>Replying to</strong>
                      <p>{replyingTo.message}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      aria-label="Cancel reply"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="chat-composer-row flex items-center w-full gap-2">
                  <div className="attachment-menu-wrap relative">
                    <Tooltip title="Attach a file">
                      <IconButton
                        className="composer-tool-button"
                        aria-label="Attach a file"
                        aria-expanded={attachmentMenuOpen}
                        onClick={() => setAttachmentMenuOpen((open) => !open)}
                      >
                        <AddCircleOutlineRounded />
                      </IconButton>
                    </Tooltip>
                    {attachmentMenuOpen && (
                      <div
                        className="attachment-menu"
                        role="menu"
                        aria-label="Choose an attachment type"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAttachmentMenuOpen(false);
                            documentInputRef.current?.click();
                          }}
                        >
                          <DescriptionOutlined />
                          Document
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAttachmentMenuOpen(false);
                            galleryInputRef.current?.click();
                          }}
                        >
                          <PhotoLibraryOutlined />
                          Gallery
                        </button>
                      </div>
                    )}
                    <input
                      ref={documentInputRef}
                      className="visually-hidden-file"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv"
                      tabIndex={-1}
                      aria-label="Choose a document"
                    />
                    <input
                      ref={galleryInputRef}
                      className="visually-hidden-file"
                      type="file"
                      accept="image/*"
                      multiple
                      tabIndex={-1}
                      aria-label="Choose photos from your gallery"
                    />
                  </div>
                  <div className="chat-composer-input-wrap flex-1 relative">
                    <input
                      type="text"
                      placeholder="Write a message..."
                      aria-label="Write a message"
                      className="chat-message-input w-full rounded-full py-3 pl-4 pr-12 text-sm focus:outline-none"
                      value={newMessage}
                      onChange={(event) => setnewMessage(event.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <IconButton
                      className="emoji-button absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      aria-label="Emoji"
                    >
                      <MoodRounded />
                    </IconButton>
                  </div>
                  <IconButton
                    onClick={sendMessage}
                    className="chat-send-button ml-1"
                    aria-label="Send message"
                  >
                    <SendRounded />
                  </IconButton>
                </div>
              </>
            ) : (
              <div className="chat-empty flex flex-col items-center justify-center h-full">
                <span className="material-symbols-outlined text-5xl mb-2 opacity-30">
                  chat
                </span>
                <p>Select a chat</p>
              </div>
            )}
          </main>

          {/* RIGHT PANE - Info */}
          <aside className="chat-info-pane h-full flex-shrink-0">
            {selecteduser ? (
              <div className="flex flex-col h-full">
                <div className="profile-card flex flex-col items-center justify-center">
                  <div className="relative mb-3">
                    <Avatar
                      className="contact-avatar profile-avatar rounded-full flex items-center justify-center text-3xl font-medium"
                      sx={{
                        width: 150,
                        height: 150,
                      }}
                    >
                      {selecteduser.profileImage ? (
                        <img
                          src={getImageUrl(selecteduser.profileImage)}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        selecteduser.name.charAt(0).toUpperCase()
                      )}
                    </Avatar>
                    {selecteduser.isOnline && (
                      <span className="contact-status-dot profile-status-dot"></span>
                    )}
                  </div>
                  <h2 className="text-lg font-medium">{selecteduser.name}</h2>
                  <p className="profile-presence">
                    {selecteduser.isOnline ? "Online now" : "Offline"}
                  </p>
                </div>
                <div className="profile-details">
                  <h3>Contact details</h3>
                  <div className="profile-detail-row">
                    <span>Email address</span>
                    <strong>{selecteduser.email}</strong>
                  </div>
                  <div className="profile-detail-row">
                    <span>Availability</span>
                    <strong>
                      {selecteduser.isOnline ? "Available" : "Offline"}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="profile-empty flex h-full items-center justify-center text-sm">
                No info available
              </div>
            )}
          </aside>
        </div>
      </div>
      {callSession && (
        <div className="call-overlay" role="presentation">
          <section
            className={`call-dialog ${callSession.callType === "video" ? "is-video-call" : "is-audio-call"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="call-dialog-title"
          >
            <header className="call-dialog-header">
              <div>
                <h2 id="call-dialog-title">
                  {callSession.callType === "video" ? "Video call" : "Voice call"}
                </h2>
                <p>{callSession.peerName}</p>
              </div>
              <span className={`call-state-pill ${callSession.status}`}>
                {callSession.status === "incoming"
                  ? "Incoming call"
                  : callSession.status === "calling"
                    ? "Calling…"
                    : callSession.status === "connected"
                      ? "Connected"
                      : "Connecting…"}
              </span>
            </header>
            {callSession.callType === "video" ? (
              <div className="call-video-stage">
                <video ref={remoteVideoRef} autoPlay playsInline />
                <video
                  ref={localVideoRef}
                  className="call-local-video"
                  autoPlay
                  muted
                  playsInline
                />
                {!remoteStream && (
                  <div className="call-video-placeholder">
                    <Avatar>{callSession.peerName.charAt(0).toUpperCase()}</Avatar>
                    <span>{callSession.status === "incoming" ? "Incoming video call" : "Waiting for video…"}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="call-audio-stage">
                <Avatar className="call-avatar">{callSession.peerName.charAt(0).toUpperCase()}</Avatar>
                <strong>{callSession.peerName}</strong>
                <span>{callSession.status === "incoming" ? "is calling you" : callSession.status === "connected" ? "Voice call in progress" : "Ringing…"}</span>
                <audio ref={remoteAudioRef} autoPlay />
              </div>
            )}
            <footer className="call-dialog-actions">
              {callSession.status === "incoming" ? (
                <>
                  <button type="button" className="call-decline-button" onClick={() => endCall(true, "call:reject")}>
                    Decline
                  </button>
                  <button type="button" className="call-accept-button" onClick={acceptCall}>
                    Accept
                  </button>
                </>
              ) : (
                <button type="button" className="call-hangup-button" onClick={() => endCall(true)}>
                  <CallRounded />
                  <span>End call</span>
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
      {contactPickerOpen && (
        <div
          className="contact-picker-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setContactPickerOpen(false);
          }}
        >
          <section
            className="contact-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-picker-title"
          >
            <header className="contact-picker-header">
              <div>
                <p className="chat-overline">CONNECT</p>
                <h2 id="contact-picker-title">Start a new chat</h2>
                <p>Choose someone from your Connect community.</p>
              </div>
              <IconButton
                className="contact-picker-close"
                aria-label="Close contact picker"
                onClick={() => setContactPickerOpen(false)}
              >
                <CloseRounded />
              </IconButton>
            </header>
            <label
              className="contact-picker-search-label"
              htmlFor="contact-picker-search"
            >
              Find a person
            </label>
            <input
              id="contact-picker-search"
              className="contact-picker-search"
              type="search"
              placeholder="Search by name or email"
              value={contactQuery}
              onChange={(event) => setContactQuery(event.target.value)}
              autoFocus
            />
            <div className="contact-picker-list">
              {filteredContacts.length ? (
                filteredContacts.map((user) => (
                  <button
                    className="contact-picker-item"
                    type="button"
                    key={user._id}
                    onClick={() => openChat(user)}
                  >
                    <span className="contact-picker-avatar">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="contact-picker-user">
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </span>
                    <ArrowForwardRounded className="contact-picker-arrow" />
                  </button>
                ))
              ) : (
                <p className="contact-picker-empty">
                  {users.length
                    ? "No people match that search."
                    : "No other accounts are available yet."}
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default ChatHome;
