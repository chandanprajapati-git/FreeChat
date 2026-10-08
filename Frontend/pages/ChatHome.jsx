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
import AudioFileRounded from "@mui/icons-material/AudioFileRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import CallRounded from "@mui/icons-material/CallRounded";
import VideocamRounded from "@mui/icons-material/VideocamRounded";
import NotificationsNoneRounded from "@mui/icons-material/NotificationsNoneRounded";
import QrCodeRounded from "@mui/icons-material/QrCodeRounded";
import QrCodeScannerRounded from "@mui/icons-material/QrCodeScannerRounded";

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
  const [profileName, setProfileName] = useState(
    () => localStorage.getItem("profileName") || "My account",
  );
  const [unreadCounts, setUnreadCounts] = useState({});
  const [selecteduser, setselecteduser] = useState(null);
  const [messages, setmessages] = useState([]);
  const [newMessage, setnewMessage] = useState("");
  const [peerDraft, setPeerDraft] = useState("");
  const [socket, setsocket] = useState(null);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [myQrOpen, setMyQrOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [myQrImage, setMyQrImage] = useState("");
  const [qrScanStatus, setQrScanStatus] = useState("");
  const [qrRequestSending, setQrRequestSending] = useState(false);
  const [requestPanelOpen, setRequestPanelOpen] = useState(false);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [searchResult, setSearchResult] = useState(null);
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [friendActionError, setFriendActionError] = useState("");
  const [contactQuery, setContactQuery] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [composerError, setComposerError] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [myProfileImage, setMyProfileImage] = useState("");
  const [myPhone, setMyPhone] = useState("");
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [messageActionError, setMessageActionError] = useState("");
  const [openMessageMenuId, setOpenMessageMenuId] = useState(null);
  const [callNotice, setCallNotice] = useState("");
  const [callSession, setCallSession] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    return `https://freechat-ydqe.onrender.com${imagePath}`;
  };

  const messagesEndRef = useRef(null);
  const documentInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const peerConnectionRef = useRef(new Map());
  const callSessionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingIceCandidatesRef = useRef(new Map());
  const typingSequenceRef = useRef(0);
  const qrScanHandledRef = useRef(false);
  const selectedUserId = selecteduser?._id;
  const selectedUserIdRef = useRef(selectedUserId);
  selectedUserIdRef.current = selectedUserId;
  const userIdsKey = users.map((user) => user._id).join(",");
  const emitTypingUpdate = (toUserId, text) => {
    socket?.emit("typing:update", {
      toUserId,
      text,
      sequence: ++typingSequenceRef.current,
    });
  };
  const visibleUsers = users.filter((user) =>
    `${user.name} ${user.email} ${user.phone || ""}`
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
    setPeerDraft("");
    if (selecteduser?._id !== user._id) {
      setmessages([]);
      setselecteduser(user);
    }
    setContactPickerOpen(false);
    setContactQuery("");
  };

  const refreshFriendContacts = async () => {
    try {
      const response = await fetch("https://freechat-ydqe.onrender.com/api/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) return;
      const contacts = await response.json();
      setusers(contacts);
      setselecteduser((current) => current
        ? contacts.find((user) => String(user._id) === String(current._id)) || null
        : null);
    } catch {
      // The regular contact refresh will retry if the server is temporarily unavailable.
    }
  };

  const refreshFriendRequests = async () => {
    try {
      const response = await fetch("https://freechat-ydqe.onrender.com/api/friends/requests", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.ok) setFriendRequests(await response.json());
    } catch {
      // Keep the last request list visible while offline.
    }
  };

  const savePhoneNumber = async (event) => {
    event.preventDefault();
    setPhoneError("");
    try {
      const response = await fetch("https://freechat-ydqe.onrender.com/api/users/phone", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ phone: phoneDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save mobile number.");
      setMyPhone(data.user.phone);
      setPhoneDraft(data.user.phone);
      setPhoneDialogOpen(false);
    } catch (error) {
      setPhoneError(error.message);
    }
  };

  const sendFriendRequest = async (user) => {
    setFriendActionError("");
    try {
      const response = await fetch("https://freechat-ydqe.onrender.com/api/friends/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ userId: user._id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not send request.");
      setSearchResult((current) => current ? { ...current, relationship: "outgoing" } : current);
      await refreshFriendRequests();
    } catch (error) {
      setFriendActionError(error.message);
    }
  };

  const handleScannedQr = async (decodedText) => {
    if (qrScanHandledRef.current || qrRequestSending) return;
    const match = String(decodedText || "").trim().match(/^connectchat:([a-f\d]{24})$/i);
    if (!match) {
      setQrScanStatus("This QR code is not a Connect friend code.");
      return;
    }
    const userId = match[1];
    if (userId.toLowerCase() === currentUserId.toLowerCase()) {
      setQrScanStatus("That is your own QR code.");
      return;
    }

    qrScanHandledRef.current = true;
    setQrRequestSending(true);
    setQrScanStatus("Sending friend request…");
    try {
      const response = await fetch("https://freechat-ydqe.onrender.com/api/friends/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not send friend request.");
      setQrScanStatus("Friend request sent. They need to accept it before you can chat.");
      await refreshFriendRequests();
    } catch (error) {
      qrScanHandledRef.current = false;
      setQrScanStatus(error.message || "Could not send friend request.");
    } finally {
      setQrRequestSending(false);
    }
  };

  const acceptFriendRequest = async (requestId, friend) => {
    setFriendActionError("");
    try {
      const response = await fetch(`https://freechat-ydqe.onrender.com/api/friends/requests/${requestId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not accept request.");
      setSearchResult((current) => current ? { ...current, relationship: "friends" } : current);
      setFriendRequests((current) => ({
        ...current,
        incoming: current.incoming.filter((item) => String(item._id) !== String(requestId)),
      }));
      await refreshFriendContacts();
      await refreshFriendRequests();
      if (friend) setusers((current) => current.some((item) => String(item._id) === String(friend._id)) ? current : [...current, friend]);
    } catch (error) {
      setFriendActionError(error.message);
    }
  };

  const rejectFriendRequest = async (requestId) => {
    setFriendActionError("");
    try {
      const response = await fetch(`https://freechat-ydqe.onrender.com/api/friends/requests/${requestId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not decline request.");
      setFriendRequests((current) => ({
        ...current,
        incoming: current.incoming.filter((item) => String(item._id) !== String(requestId)),
      }));
    } catch (error) {
      setFriendActionError(error.message);
    }
  };

  const unfriend = async (friend) => {
    if (!window.confirm(`Remove ${friend.name} from your friends?`)) return;
    try {
      const response = await fetch(`https://freechat-ydqe.onrender.com/api/friends/${friend._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not remove friend.");
      if (callSessionRef.current?.peerUserId === String(friend._id)) endCall(true);
      setselecteduser(null);
      setmessages([]);
      await refreshFriendContacts();
    } catch (error) {
      setFriendActionError(error.message);
    }
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
    const digits = contactQuery.replace(/\D/g, "");
    setSearchResult(null);
    setFriendActionError("");
    if (digits.length < 7) {
      setSearchingPeople(false);
      return undefined;
    }
    setSearchingPeople(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`https://freechat-ydqe.onrender.com/api/friends/search?phone=${encodeURIComponent(digits)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const result = await response.json();
        if (!response.ok) {
          setSearchResult({ error: result.message || "No account found with that number." });
        } else {
          setSearchResult(result);
        }
      } catch {
        setSearchResult({ error: "Could not search right now. Check your connection." });
      } finally {
        setSearchingPeople(false);
      }
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [contactQuery]);

  useEffect(() => {
    refreshFriendRequests();
    const refreshInterval = window.setInterval(refreshFriendRequests, 15000);
    const onFriendRequestChange = () => refreshFriendRequests();
    const onFriendshipRemoved = ({ userId }) => {
      if (String(selectedUserIdRef.current) === String(userId)) {
        if (callSessionRef.current?.peerUserId === String(userId)) endCall(true);
        setmessages([]);
      }
      refreshFriendContacts();
    };
    socket?.on("friendRequestReceived", onFriendRequestChange);
    socket?.on("friendRequestUpdated", onFriendRequestChange);
    socket?.on("friendshipRemoved", onFriendshipRemoved);
    return () => {
      window.clearInterval(refreshInterval);
      socket?.off("friendRequestReceived", onFriendRequestChange);
      socket?.off("friendRequestUpdated", onFriendRequestChange);
      socket?.off("friendshipRemoved", onFriendshipRemoved);
    };
  }, [socket]);

  useEffect(() => {
    if (!userIdsKey) return undefined;
    let isActive = true;
    const token = localStorage.getItem("token");
    const loadUnreadCounts = async () => {
      const results = await Promise.allSettled(
        users.map(async (user) => {
          const response = await fetch(
            `https://freechat-ydqe.onrender.com/api/messages/${user._id}`,
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
        const response = await fetch("https://freechat-ydqe.onrender.com/api/users", {
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
            ? data.find((user) => user._id === currentUser._id) || null
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
    if (!socket) return undefined;
    const onPresenceUpdate = ({ userId, isOnline, lastSeen }) => {
      const normalizedUserId = String(userId);
      const updatePresence = (user) =>
        String(user._id) === normalizedUserId
          ? { ...user, isOnline, ...(lastSeen ? { lastSeen } : {}) }
          : user;

      setusers((currentUsers) => currentUsers.map(updatePresence));
      setselecteduser((currentUser) =>
        currentUser ? updatePresence(currentUser) : currentUser,
      );
    };

    socket.on("presenceUpdate", onPresenceUpdate);
    return () => socket.off("presenceUpdate", onPresenceUpdate);
  }, [socket]);

  useEffect(() => {
    if (!socket) return undefined;
    const onTypingUpdate = ({ fromUserId, text }) => {
      if (String(fromUserId) === String(selectedUserIdRef.current)) {
        setPeerDraft(String(text || ""));
      }
    };
    socket.on("typing:update", onTypingUpdate);
    return () => socket.off("typing:update", onTypingUpdate);
  }, [socket]);

  useEffect(() => {
    if (!socket || !selectedUserId) return undefined;
    return () => emitTypingUpdate(selectedUserId, "");
  }, [socket, selectedUserId]);

  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          "https://freechat-ydqe.onrender.com/api/users/profile",
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
        setMyPhone(data.phone || "");
        setPhoneDraft(data.phone || "");
        if (data.name) {
          setProfileName(data.name);
          localStorage.setItem("profileName", data.name);
        }
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
          `https://freechat-ydqe.onrender.com/api/messages/${selectedUserId}`,
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
        "https://freechat-ydqe.onrender.com/api/users/profile-image",
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
        `https://freechat-ydqe.onrender.com/api/messages/${messageId}`,
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
        `https://freechat-ydqe.onrender.com/api/messages/${messageId}`,
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

  const sendMessage = async (text = newMessage, file = null) => {
    if (!selecteduser || (!text.trim() && !file) || !socket) {
      return;
    }
    try {
      setComposerError("");
      const token = localStorage.getItem("token");
      const body = file ? new FormData() : JSON.stringify({
        receiverId: selecteduser._id,
        message: text,
        replyTo: replyingTo?._id || null,
      });
      if (file) {
        body.append("receiverId", selecteduser._id);
        body.append("message", text);
        body.append("replyTo", replyingTo?._id || "");
        body.append("file", file);
      }
      const response = await fetch("https://freechat-ydqe.onrender.com/api/messages", {
        method: "POST",
        headers: {
          ...(file ? {} : { "Content-Type": "application/json" }),
          Authorization: `Bearer ${token}`,
        },
        body,
      });
      const data = await response.json();
      if (!response.ok) {
        setComposerError(data.message || "Could not send this message.");
        return;
      }
      setmessages((prevMessages) => [...prevMessages, data.data]);
      setnewMessage("");
      emitTypingUpdate(selecteduser._id, "");
      setReplyingTo(null);
    } catch (error) {
      setComposerError(error.message || "Could not send this message. Check your connection and try again.");
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
    peerConnectionRef.current.forEach((peerConnection) => peerConnection.close());
    peerConnectionRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams({});
    pendingIceCandidatesRef.current.clear();
    setAddParticipantOpen(false);
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

  const flushIceCandidates = async (peerConnection, peerUserId) => {
    const queuedCandidates = pendingIceCandidatesRef.current.get(peerUserId) || [];
    pendingIceCandidatesRef.current.delete(peerUserId);
    for (const candidate of queuedCandidates) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const createPeerConnection = async (activeCall, stream, peerUserId = activeCall.peerUserId) => {
    const turnUrls = (import.meta.env.VITE_TURN_URLS || "")
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean);
    const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
    if (turnUrls.length) {
      iceServers.push({
        urls: turnUrls,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL,
      });
    }
    const peerConnection = new RTCPeerConnection({ iceServers });
    peerConnectionRef.current.set(String(peerUserId), peerConnection);
    const senders = stream.getTracks().map((track) => {
      track.contentHint = track.kind === "audio" ? "speech" : "motion";
      return peerConnection.addTrack(track, stream);
    });
    await Promise.all(senders.map(async (sender) => {
      const parameters = sender.getParameters();
      parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}];
      parameters.encodings[0].maxBitrate = sender.track.kind === "audio" ? 128000 : 1800000;
      if (sender.track.kind === "video") parameters.encodings[0].maxFramerate = 30;
      parameters.encodings[0].priority = "high";
      try {
        await sender.setParameters(parameters);
      } catch {
        // Some browsers do not allow sender tuning; WebRTC still negotiates normally.
      }
    }));
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit("call:ice-candidate", {
          toUserId: String(peerUserId),
          callId: activeCall.callId,
          candidate: event.candidate,
        });
      }
    };
    peerConnection.ontrack = (event) => {
      setRemoteStreams((currentStream) => {
        const streamToUse = currentStream[String(peerUserId)] || new MediaStream();
        if (!streamToUse.getTracks().some((track) => track.id === event.track.id)) {
          streamToUse.addTrack(event.track);
        }
        return { ...currentStream, [String(peerUserId)]: streamToUse };
      });
    };
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        const currentCall = callSessionRef.current;
        if (currentCall?.callId === activeCall.callId) {
          setActiveCall({ ...currentCall, status: "connected" });
        }
      } else if (["failed", "closed"].includes(peerConnection.connectionState)) {
        if (callSessionRef.current?.callId === activeCall.callId) {
          peerConnectionRef.current.delete(String(peerUserId));
          setRemoteStreams((current) => {
            const next = { ...current };
            delete next[String(peerUserId)];
            return next;
          });
          const currentCall = callSessionRef.current;
          const participants = (currentCall.participants || []).filter((id) => String(id) !== String(peerUserId));
          setActiveCall({ ...currentCall, participants });
          if (participants.length <= 1) cleanupCall();
        }
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
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: callType === "video" ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        } : false,
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
        participants: [currentUserId, String(selecteduser._id)],
      };
      setActiveCall(activeCall);
      const peerConnection = await createPeerConnection(activeCall, stream);
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
    if (!activeCall?.offer && !activeCall?.groupInvite) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: activeCall.callType === "video" ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        } : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      if (activeCall.groupInvite) {
        setActiveCall({ ...activeCall, status: "connecting", participants: activeCall.participants || [] });
        socket.emit("call:join", {
          callId: activeCall.callId,
          toUserId: activeCall.peerUserId,
        });
        return;
      }
      const peerConnection = await createPeerConnection(activeCall, stream);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(activeCall.offer));
      await flushIceCandidates(peerConnection, activeCall.peerUserId);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("call:answer", {
        toUserId: activeCall.peerUserId,
        callId: activeCall.callId,
        answer: peerConnection.localDescription,
      });
      setActiveCall({ ...activeCall, status: "connecting", offer: null, participants: [currentUserId, activeCall.peerUserId] });
    } catch (error) {
      endCall(true, "call:reject");
      setCallNotice(error.name === "NotAllowedError"
        ? "Allow camera and microphone access to answer the call."
        : "Could not answer the call.");
    }
  };

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
    const handlePeerOffer = async (data) => {
      const activeCall = callSessionRef.current;
      const peerUserId = String(data.fromUserId);
      if (!activeCall || activeCall.callId !== data.callId || !localStreamRef.current || peerConnectionRef.current.has(peerUserId)) return;
      try {
        const peerConnection = await createPeerConnection(activeCall, localStreamRef.current, peerUserId);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        await flushIceCandidates(peerConnection, peerUserId);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("call:answer", {
          toUserId: peerUserId,
          callId: activeCall.callId,
          answer: peerConnection.localDescription,
        });
      } catch {
        setCallNotice(`Could not connect to ${getCallName(peerUserId)}.`);
      }
    };
    const onIncomingCall = (data) => {
      const currentCall = callSessionRef.current;
      if (currentCall?.callId === data.callId && data.offer) {
        void handlePeerOffer(data);
        return;
      }
      if (currentCall) {
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
        groupInvite: Boolean(data.groupInvite),
        participants: data.participants || [currentUserId, String(data.fromUserId)],
      });
    };
    const onCallAnswered = async (data) => {
      const activeCall = callSessionRef.current;
      const peerConnection = peerConnectionRef.current.get(String(data.fromUserId));
      if (!activeCall || activeCall.callId !== data.callId || !peerConnection) return;
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        await flushIceCandidates(peerConnection, String(data.fromUserId));
        setActiveCall({ ...activeCall, status: "connecting" });
      } catch {
        setCallNotice("Could not connect the call.");
        endCall(true);
      }
    };
    const onIceCandidate = async (data) => {
      const activeCall = callSessionRef.current;
      if (!activeCall || activeCall.callId !== data.callId || !data.candidate) return;
      const peerUserId = String(data.fromUserId);
      const peerConnection = peerConnectionRef.current.get(peerUserId);
      if (!peerConnection?.remoteDescription) {
        const pending = pendingIceCandidatesRef.current.get(peerUserId) || [];
        pending.push(data.candidate);
        pendingIceCandidatesRef.current.set(peerUserId, pending);
        return;
      }
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {
        // Ignore stale ICE candidates after a call has already ended.
      }
    };
    const onCallRejected = (data) => {
      const activeCall = callSessionRef.current;
      if (activeCall?.callId !== data.callId) return;
      if (String(activeCall.peerUserId) === String(data.fromUserId)) {
        cleanupCall();
        setCallNotice(`${activeCall.peerName || "Contact"} declined the call.`);
      } else {
        setCallNotice(`${getCallName(data.fromUserId)} declined the invitation.`);
      }
    };
    const onCallEnded = (data) => {
      const activeCall = callSessionRef.current;
      if (activeCall?.callId !== data.callId) return;
      const peerUserId = String(data.fromUserId || activeCall.peerUserId);
      peerConnectionRef.current.get(peerUserId)?.close();
      peerConnectionRef.current.delete(peerUserId);
      pendingIceCandidatesRef.current.delete(peerUserId);
      setRemoteStreams((current) => {
        const next = { ...current };
        delete next[peerUserId];
        return next;
      });
      const participants = (activeCall.participants || []).filter((id) => String(id) !== peerUserId);
      setActiveCall({ ...activeCall, participants });
      if (participants.length <= 1) cleanupCall();
    };
    const onCallUnavailable = (data) => {
      if (callSessionRef.current?.callId !== data.callId) return;
      const reason = data.reason === "full" ? "This call already has the maximum number of people." : data.reason === "not-friends" ? "Calls are available between friends." : data.reason === "ended" ? "This call has already ended." : data.reason === "server-error" ? "Could not join this call. Try again." : "That person is offline and can’t receive a call right now.";
      if (callSessionRef.current?.status === "calling" || callSessionRef.current?.groupInvite) cleanupCall();
      setCallNotice(reason);
    };
    const onParticipantJoined = async (data) => {
      const activeCall = callSessionRef.current;
      if (!activeCall || activeCall.callId !== data.callId) return;
      setActiveCall({ ...activeCall, participants: data.participants });
      if (String(data.joinedUserId) === currentUserId || !localStreamRef.current) return;
      const peerUserId = String(data.joinedUserId);
      if (peerConnectionRef.current.has(peerUserId)) return;
      try {
        const peerConnection = await createPeerConnection(activeCall, localStreamRef.current, peerUserId);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("call:offer", {
          toUserId: peerUserId,
          callId: activeCall.callId,
          callType: activeCall.callType,
          offer: peerConnection.localDescription,
        });
      } catch {
        setCallNotice(`Could not invite ${getCallName(peerUserId)} into the call.`);
      }
    };
    socket.on("call:incoming", onIncomingCall);
    socket.on("call:answered", onCallAnswered);
    socket.on("call:ice-candidate", onIceCandidate);
    socket.on("call:rejected", onCallRejected);
    socket.on("call:ended", onCallEnded);
    socket.on("call:unavailable", onCallUnavailable);
    socket.on("call:participant-joined", onParticipantJoined);
    return () => {
      socket.off("call:incoming", onIncomingCall);
      socket.off("call:answered", onCallAnswered);
      socket.off("call:ice-candidate", onIceCandidate);
      socket.off("call:rejected", onCallRejected);
      socket.off("call:ended", onCallEnded);
      socket.off("call:unavailable", onCallUnavailable);
      socket.off("call:participant-joined", onParticipantJoined);
    };
  }, [socket, users, selecteduser]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const decoded = jwtDecode(token);
    const newSocket = io("https://freechat-ydqe.onrender.com", {
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
      const senderId = String(data.sender?._id || data.sender);
      if (senderId === String(currentUserId)) {
        const receiverId = String(data.receiver?._id || data.receiver);
        if (receiverId === String(selectedUserId)) {
          setmessages((prevMessages) => prevMessages.some((message) => message._id === data._id) ? prevMessages : [...prevMessages, data]);
        }
        return;
      }
      socket.emit("messageDelivered", { messageId: data._id });
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
  }, [socket, selectedUserId, currentUserId]);

  useEffect(() => {
    let active = true;
    if (!myQrOpen || !currentUserId) return () => { active = false; };
    import("qrcode").then(({ default: QRCode }) => QRCode.toDataURL(`connectchat:${currentUserId}`, {
      width: 280,
      margin: 2,
      color: { dark: "#172033", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })).then((image) => {
      if (active) setMyQrImage(image);
    }).catch(() => {
      if (active) setQrScanStatus("Could not create your QR code.");
    });
    return () => { active = false; };
  }, [myQrOpen, currentUserId]);

  useEffect(() => {
    if (!qrScannerOpen) return undefined;
    let cancelled = false;
    let scanner;
    qrScanHandledRef.current = false;
    setQrScanStatus("Point your camera at a friend’s Connect QR code.");
    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        scanner = new Html5Qrcode("connect-qr-reader");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1 },
          (decodedText) => {
            if (!cancelled) {
              void scanner?.stop().catch(() => {});
              void handleScannedQr(decodedText);
            }
          },
          () => {},
        );
      } catch {
        if (!cancelled) setQrScanStatus("Camera access is unavailable. Allow camera permission and try again.");
      }
    };
    void startScanner();
    return () => {
      cancelled = true;
      if (scanner?.isScanning) {
        void scanner.stop().then(() => scanner.clear()).catch(() => {});
      }
    };
  }, [qrScannerOpen]);

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
            <button className="profile-account-button" type="button" onClick={() => setPhoneDialogOpen(true)}>
              {myPhone ? (profileName || "My account") : "Add mobile number"}
            </button>
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
            <Tooltip title="Scan a friend QR code" placement="right">
              <IconButton className="rail-button" aria-label="Scan a friend QR code" onClick={() => { setQrScanStatus(""); setQrScannerOpen(true); }}>
                <QrCodeScannerRounded />
              </IconButton>
            </Tooltip>
            <Tooltip title="Show my QR code" placement="right">
              <IconButton className="rail-button" aria-label="Show my QR code" onClick={() => { setQrScanStatus(""); setMyQrOpen(true); }}>
                <QrCodeRounded />
              </IconButton>
            </Tooltip>
            <Tooltip title="Friend requests" placement="right">
              <span className="rail-notification-wrap">
                <IconButton
                  className="rail-button"
                  aria-label={`Friend requests${friendRequests.incoming.length ? `, ${friendRequests.incoming.length} pending` : ""}`}
                  onClick={() => setRequestPanelOpen(true)}
                >
                  <NotificationsNoneRounded />
                </IconButton>
                {friendRequests.incoming.length > 0 && (
                  <span className="rail-notification-badge">{friendRequests.incoming.length > 99 ? "99+" : friendRequests.incoming.length}</span>
                )}
              </span>
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
                            {msg.kind === "call" ? (
                              <div className="call-history-message">
                                <span className="call-history-icon" aria-hidden="true">{msg.call?.type === "video" ? "▣" : "☎"}</span>
                                <div>
                                  <strong>{msg.call?.status === "completed" ? `${isSentByMe ? "Outgoing" : "Incoming"} ${msg.call?.type || "audio"} call` : `${msg.call?.status === "missed" || msg.call?.status === "unanswered" ? "Missed" : "Declined"} ${msg.call?.type || "audio"} call`}</strong>
                                  {msg.call?.status === "completed" && <span>{Math.floor((msg.call.durationSeconds || 0) / 60)}:{String((msg.call.durationSeconds || 0) % 60).padStart(2, "0")}</span>}
                                </div>
                              </div>
                            ) : (
                            <>
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
                              <>
                              {msg.attachment && (
                                <div className="message-attachment">
                                  {msg.attachment.mimeType?.startsWith("image/") ? (
                                    <a href={getImageUrl(msg.attachment.url)} target="_blank" rel="noreferrer">
                                      <img className="message-attachment-image" src={getImageUrl(msg.attachment.url)} alt={msg.attachment.name} />
                                    </a>
                                  ) : msg.attachment.mimeType?.startsWith("audio/") ? (
                                    <audio className="message-attachment-audio" controls preload="metadata" src={getImageUrl(msg.attachment.url)} />
                                  ) : (
                                    <a className="message-attachment-file" href={getImageUrl(msg.attachment.url)} target="_blank" rel="noreferrer" download={msg.attachment.name}>
                                      <DescriptionOutlined />
                                      <span>{msg.attachment.name}</span>
                                    </a>
                                  )}
                                </div>
                              )}
                              {msg.message && (!msg.attachment || msg.message !== msg.attachment.name) && (
                                <p className="text-[15px] leading-[1.3] font-normal">{msg.message}</p>
                              )}
                              </>
                            )}
                            </>
                            )}
                            {msg.kind !== "call" && (
                              <div className="message-actions">
                                <button
                                  type="button"
                                  className="message-menu-trigger"
                                  aria-label="Message actions"
                                  aria-haspopup="menu"
                                  aria-expanded={openMessageMenuId === msg._id}
                                  onClick={() => setOpenMessageMenuId((current) => current === msg._id ? null : msg._id)}
                                >
                                  <KeyboardArrowDownRounded fontSize="small" />
                                </button>
                                {openMessageMenuId === msg._id && (
                                  <div className="message-action-menu" role="menu">
                                    <button type="button" role="menuitem" onClick={() => { setReplyingTo(msg); setOpenMessageMenuId(null); }}>Reply</button>
                                    {isSentByMe && <>
                                      <button type="button" role="menuitem" onClick={() => { setMessageActionError(""); setEditingMessageId(msg._id); setEditingText(msg.message); setOpenMessageMenuId(null); }}>Edit</button>
                                      <button type="button" role="menuitem" onClick={() => { setOpenMessageMenuId(null); deleteMessage(msg._id); }}>Delete</button>
                                    </>}
                                  </div>
                                )}
                              </div>
                            )}
                            {msg.kind !== "call" && (
                            <div className={`message-footer-row ${isSentByMe ? "message-footer-outgoing" : "message-footer-incoming"}`}>
                            <time className="message-time" dateTime={msg.createdAt || undefined} title={msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}>
                              {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                            </time>
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
                            )}
                            {msg.kind === "call" && msg.createdAt && <time className="message-time call-history-time" dateTime={msg.createdAt}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>}
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
                {peerDraft && (
                  <div className="live-draft-preview" aria-live="polite">
                    <strong>{selecteduser.name} is typing</strong>
                    <p>{peerDraft}</p>
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
                            audioInputRef.current?.click();
                          }}
                        >
                          <AudioFileRounded />
                          Audio
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
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) sendMessage(newMessage, file);
                        event.target.value = "";
                      }}
                    />
                    <input
                      ref={galleryInputRef}
                      className="visually-hidden-file"
                      type="file"
                      accept="image/*"
                      tabIndex={-1}
                      aria-label="Choose photos from your gallery"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) sendMessage(newMessage, file);
                        event.target.value = "";
                      }}
                    />
                    <input
                      ref={audioInputRef}
                      className="visually-hidden-file"
                      type="file"
                      accept="audio/*"
                      tabIndex={-1}
                      aria-label="Choose an audio file"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) sendMessage(newMessage, file);
                        event.target.value = "";
                      }}
                    />
                  </div>
                  <div className="chat-composer-input-wrap flex-1 relative">
                    <input
                      type="text"
                      maxLength={1000}
                      placeholder="Write a message..."
                      aria-label="Write a message"
                      className="chat-message-input w-full rounded-full py-3 pl-4 pr-12 text-sm focus:outline-none"
                      value={newMessage}
                      onChange={(event) => {
                        const text = event.target.value;
                        setnewMessage(text);
                        emitTypingUpdate(selecteduser._id, text);
                      }}
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
                      aria-expanded={emojiPickerOpen}
                      onClick={() => setEmojiPickerOpen((open) => !open)}
                    >
                      <MoodRounded />
                    </IconButton>
                    {emojiPickerOpen && (
                      <div className="emoji-picker" role="listbox" aria-label="Choose an emoji">
                        {["😀", "😂", "🥰", "😍", "😊", "😉", "😎", "😭", "😮", "😢", "❤️", "👍", "🙏", "🎉", "🔥", "✨"].map((emoji) => (
                          <button key={emoji} type="button" role="option" aria-label={`Insert ${emoji}`} onClick={() => {
                            setnewMessage((current) => `${current}${emoji}`);
                            setEmojiPickerOpen(false);
                          }}>{emoji}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <IconButton
                    onClick={() => sendMessage()}
                    className="chat-send-button ml-1"
                    aria-label="Send message"
                  >
                    <SendRounded />
                  </IconButton>
                </div>
                {composerError && <p className="composer-error" role="alert">{composerError}</p>}
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
                  <button className="unfriend-button" type="button" onClick={() => unfriend(selecteduser)}>
                    Remove friend
                  </button>
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
                  {callSession.callType === "video" ? "Video call" : "Voice call"}{(callSession.participants?.length || 0) > 2 ? ` · ${callSession.participants.length} people` : ""}
                </h2>
                <p>{callSession.peerName}</p>
              </div>
              <div className="call-dialog-header-actions">
                {callSession.status === "connected" && (
                  <div className="call-add-participant-wrap">
                    <button type="button" className="call-add-participant" disabled={(callSession.participants?.length || 0) >= 4} onClick={() => setAddParticipantOpen((open) => !open)}>
                      <GroupAddRounded fontSize="small" /> Add friend
                    </button>
                    {addParticipantOpen && (
                      <div className="call-participant-menu" role="menu" aria-label="Add a friend to this call">
                        {users.filter((user) => !callSession.participants?.some((id) => String(id) === String(user._id))).map((user) => (
                          <button key={user._id} type="button" role="menuitem" onClick={() => {
                            socket?.emit("call:add-participant", { callId: callSession.callId, toUserId: user._id });
                            setAddParticipantOpen(false);
                            setCallNotice(`Inviting ${user.name}…`);
                          }}>{user.name}</button>
                        ))}
                        {!users.some((user) => !callSession.participants?.some((id) => String(id) === String(user._id))) && <span>No more friends to add.</span>}
                      </div>
                    )}
                  </div>
                )}
                <span className={`call-state-pill ${callSession.status}`}>
                  {callSession.status === "incoming" ? "Incoming call" : callSession.status === "calling" ? "Calling…" : callSession.status === "connected" ? "Connected" : "Connecting…"}
                </span>
              </div>
            </header>
            {callNotice && <p className="call-dialog-notice" role="status">{callNotice}</p>}
            {callSession.callType === "video" ? (
              <div className={`call-video-stage${(callSession.participants?.length || 0) > 2 ? " is-group-call" : ""}`}>
                {Object.entries(remoteStreams).map(([userId, stream]) => (
                  <div className="call-video-tile" key={userId}>
                    <video className="call-remote-video" ref={(element) => { if (element && element.srcObject !== stream) element.srcObject = stream; }} autoPlay playsInline />
                    <span>{getCallName(userId)}</span>
                  </div>
                ))}
                {localStream && <video className="call-local-video" ref={(element) => { if (element && element.srcObject !== localStream) element.srcObject = localStream; }} autoPlay muted playsInline />}
                {!Object.keys(remoteStreams).length && (
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
                {(callSession.participants?.length || 0) > 2 && (
                  <div className="call-audio-participants">
                    {callSession.participants.map((userId) => <span key={userId}>{String(userId) === currentUserId ? "You" : getCallName(userId)}</span>)}
                  </div>
                )}
                <span>{callSession.status === "incoming" ? "is calling you" : callSession.status === "connected" ? "Voice call in progress" : "Ringing…"}</span>
                {Object.entries(remoteStreams).map(([userId, stream]) => (
                  <audio key={userId} ref={(element) => { if (element && element.srcObject !== stream) element.srcObject = stream; }} autoPlay />
                ))}
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
      {myQrOpen && (
        <div className="contact-picker-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setMyQrOpen(false);
        }}>
          <section className="contact-picker qr-dialog" role="dialog" aria-modal="true" aria-labelledby="my-qr-title">
            <header className="contact-picker-header">
              <div><p className="chat-overline">CONNECT</p><h2 id="my-qr-title">Your friend QR code</h2><p>Let someone scan this code to send you a friend request.</p></div>
              <IconButton className="contact-picker-close" aria-label="Close my QR code" onClick={() => setMyQrOpen(false)}><CloseRounded /></IconButton>
            </header>
            {myQrImage ? <img className="my-friend-qr" src={myQrImage} alt={`Unique Connect QR code for ${profileName}`} /> : <p className="contact-picker-empty">Creating your QR code…</p>}
            <strong className="qr-account-name">{profileName}</strong>
            <p className="qr-help-text">A friend request still needs your approval before messaging can begin.</p>
          </section>
        </div>
      )}
      {qrScannerOpen && (
        <div className="contact-picker-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setQrScannerOpen(false);
        }}>
          <section className="contact-picker qr-dialog" role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title">
            <header className="contact-picker-header">
              <div><p className="chat-overline">CONNECT</p><h2 id="qr-scanner-title">Scan a friend QR code</h2><p>Allow camera access and point it at their code.</p></div>
              <IconButton className="contact-picker-close" aria-label="Close QR scanner" onClick={() => setQrScannerOpen(false)}><CloseRounded /></IconButton>
            </header>
            <div id="connect-qr-reader" className="connect-qr-reader" />
            {qrScanStatus && <p className="qr-help-text" role="status">{qrScanStatus}</p>}
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
                <p>Find someone using their mobile number, then send a request.</p>
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
              Mobile number
            </label>
            <input
              id="contact-picker-search"
              className="contact-picker-search"
              type="search"
              placeholder="Enter mobile number, including country code"
              inputMode="tel"
              value={contactQuery}
              onChange={(event) => setContactQuery(event.target.value)}
              autoFocus
            />
            <div className="contact-picker-list">
              {searchingPeople ? (
                <p className="contact-picker-empty">Searching by mobile number…</p>
              ) : searchResult?.user ? (
                <div className="contact-picker-result">
                  <span className="contact-picker-avatar">{searchResult.user.name.charAt(0).toUpperCase()}</span>
                  <span className="contact-picker-user">
                    <strong>{searchResult.user.name}</strong>
                    <small>{searchResult.relationship === "friends" ? "Already friends" : "Found by mobile number"}</small>
                  </span>
                  {searchResult.relationship === "friends" ? (
                    <button type="button" onClick={() => openChat(searchResult.user)}>Open chat</button>
                  ) : searchResult.relationship === "outgoing" ? (
                    <button type="button" disabled>Request sent</button>
                  ) : searchResult.relationship === "incoming" ? (
                    <button type="button" onClick={() => acceptFriendRequest(searchResult.requestId, searchResult.user)}>Accept</button>
                  ) : (
                    <button type="button" onClick={() => sendFriendRequest(searchResult.user)}>Add friend</button>
                  )}
                </div>
              ) : (
                <p className="contact-picker-empty">
                  {searchResult?.error || (contactQuery.replace(/\D/g, "").length < 7
                    ? "Enter at least 7 digits to find someone by mobile number."
                    : "No account found with that mobile number.")}
                </p>
              )}
            </div>
            {friendActionError && <p className="friend-action-error" role="alert">{friendActionError}</p>}
          </section>
        </div>
      )}
      {requestPanelOpen && (
        <div className="contact-picker-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setRequestPanelOpen(false);
        }}>
          <section className="contact-picker friend-requests-panel" role="dialog" aria-modal="true" aria-labelledby="friend-requests-title">
            <header className="contact-picker-header">
              <div><p className="chat-overline">YOUR PEOPLE</p><h2 id="friend-requests-title">Friend requests</h2><p>Accept a request to start chatting.</p></div>
              <IconButton className="contact-picker-close" aria-label="Close requests" onClick={() => setRequestPanelOpen(false)}><CloseRounded /></IconButton>
            </header>
            {friendActionError && <p className="friend-action-error" role="alert">{friendActionError}</p>}
            <h3 className="request-section-title">Incoming</h3>
            {friendRequests.incoming.length ? friendRequests.incoming.map((request) => (
              <div className="friend-request-row" key={request._id}>
                <span className="contact-picker-avatar">{request.sender?.name?.charAt(0).toUpperCase() || "?"}</span>
                <span className="contact-picker-user"><strong>{request.sender?.name || "Connect user"}</strong><small>Wants to connect with you</small></span>
                <button type="button" onClick={() => acceptFriendRequest(request._id, request.sender)}>Accept</button>
                <button type="button" className="request-decline" onClick={() => rejectFriendRequest(request._id)}>Decline</button>
              </div>
            )) : <p className="contact-picker-empty">No incoming requests.</p>}
            <h3 className="request-section-title">Sent</h3>
            {friendRequests.outgoing.length ? friendRequests.outgoing.map((request) => (
              <div className="friend-request-row" key={request._id}>
                <span className="contact-picker-avatar">{request.recipient?.name?.charAt(0).toUpperCase() || "?"}</span>
                <span className="contact-picker-user"><strong>{request.recipient?.name || "Connect user"}</strong><small>Waiting for their response</small></span>
                <span className="request-pending-label">Pending</span>
              </div>
            )) : <p className="contact-picker-empty">No sent requests.</p>}
          </section>
        </div>
      )}
      {phoneDialogOpen && (
        <div className="contact-picker-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPhoneDialogOpen(false);
        }}>
          <section className="contact-picker phone-setup-panel" role="dialog" aria-modal="true" aria-labelledby="phone-setup-title">
            <header className="contact-picker-header">
              <div><p className="chat-overline">ACCOUNT</p><h2 id="phone-setup-title">Mobile number</h2><p>Friends can find you using this number.</p></div>
              <IconButton className="contact-picker-close" aria-label="Close mobile number settings" onClick={() => setPhoneDialogOpen(false)}><CloseRounded /></IconButton>
            </header>
            <form onSubmit={savePhoneNumber}>
              <input className="contact-picker-search" type="tel" inputMode="tel" autoComplete="tel" placeholder="Include your country code" value={phoneDraft} onChange={(event) => setPhoneDraft(event.target.value)} required />
              {phoneError && <p className="friend-action-error" role="alert">{phoneError}</p>}
              <button className="phone-save-button" type="submit">Save mobile number</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default ChatHome;
