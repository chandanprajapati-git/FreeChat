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
import GroupRounded from "@mui/icons-material/GroupRounded";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import PhotoCameraRounded from "@mui/icons-material/PhotoCameraRounded";
import PersonAddAlt1Rounded from "@mui/icons-material/PersonAddAlt1Rounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
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
import GifRounded from "@mui/icons-material/GifRounded";
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

function AvatarPhoto({ src, name, alt = "" }) {
  const [failedSrc, setFailedSrc] = useState("");
  const [retry, setRetry] = useState({ src: "", url: "" });
  if (!src || failedSrc === src) return <span aria-hidden="true">{name?.trim()?.charAt(0)?.toUpperCase() || "?"}</span>;
  const imageSrc = retry.src === src ? retry.url : src;
  return (
    <img
      src={imageSrc}
      alt={alt}
      onError={() => {
        if (retry.src !== src) {
          const separator = src.includes("?") ? "&" : "?";
          setRetry({ src, url: `${src}${separator}avatarRetry=1` });
        } else {
          setFailedSrc(src);
        }
      }}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
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
  const [groups, setGroups] = useState([]);
  const [recentMessages, setRecentMessages] = useState({});
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
  const [qrToolsOpen, setQrToolsOpen] = useState(false);
  const [qrTab, setQrTab] = useState("scan");
  const [myQrImage, setMyQrImage] = useState("");
  const [qrGenerationAttempt, setQrGenerationAttempt] = useState(0);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [groupEditName, setGroupEditName] = useState("");
  const [groupEditDescription, setGroupEditDescription] = useState("");
  const [groupIconFile, setGroupIconFile] = useState(null);
  const [savingGroupSettings, setSavingGroupSettings] = useState(false);
  const [groupActionError, setGroupActionError] = useState("");
  const [groupQrTarget, setGroupQrTarget] = useState(null);
  const [groupQrImage, setGroupQrImage] = useState("");
  const [groupDetails, setGroupDetails] = useState(null);
  const [groupDetailsOpen, setGroupDetailsOpen] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [addPeopleTab, setAddPeopleTab] = useState("phone");
  const [groupPhoneQuery, setGroupPhoneQuery] = useState("");
  const [groupPhoneResult, setGroupPhoneResult] = useState(null);
  const [groupPhoneError, setGroupPhoneError] = useState("");
  const [groupMemberProfile, setGroupMemberProfile] = useState(null);
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
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [profileImageDimensions, setProfileImageDimensions] = useState(null);
  const [profileZoom, setProfileZoom] = useState(1);
  const [profileCropX, setProfileCropX] = useState(0);
  const [profileCropY, setProfileCropY] = useState(0);
  const [profileImageError, setProfileImageError] = useState("");
  const [savingProfileImage, setSavingProfileImage] = useState(false);
  const [myProfileImage, setMyProfileImage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [myPhone, setMyPhone] = useState("");
  const [myStatus, setMyStatus] = useState("");
  const [statusDraft, setStatusDraft] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
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
    const backendOrigin = "https://freechat-ydqe.onrender.com";
    const normalizedPath = String(imagePath).trim().replaceAll("\\", "/");
    if (/^https?:\/\//i.test(normalizedPath)) {
      try {
        const parsedUrl = new URL(normalizedPath);
        if (parsedUrl.pathname.includes("/uploads/")) {
          return `${backendOrigin}${parsedUrl.pathname}${parsedUrl.search}`;
        }
        return normalizedPath.replace(/^http:\/\//i, "https://");
      } catch {
        return normalizedPath;
      }
    }
    return `${backendOrigin}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
  };

  const messagesEndRef = useRef(null);
  const smoothScrollNextRef = useRef(false);
  const documentInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const gifInputRef = useRef(null);
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
  const selectedGroupMemberId = String(groupMemberProfile?._id || "");
  const groupCoLeaderCount = groupDetails?.members?.filter((member) => member.role === "Co-leader").length || 0;
  const selectedGroupMemberIsFriend = users.some((user) => String(user._id) === selectedGroupMemberId);
  const incomingGroupFriendRequest = friendRequests.incoming.find((request) => String(request.sender?._id || request.sender) === selectedGroupMemberId);
  const outgoingGroupFriendRequest = friendRequests.outgoing.find((request) => String(request.recipient?._id || request.recipient) === selectedGroupMemberId);
  const messagePreview = (message) => {
    if (!message) return "No messages yet";
    const senderId = String(message.sender?._id || message.sender);
    const content = message.attachment
      ? message.attachment.mimeType?.startsWith("image/") ? "Photo" : message.attachment.mimeType?.startsWith("audio/") ? "Audio" : message.attachment.name || "File"
      : message.message || "Message";
    return `${senderId === String(currentUserId) ? "You: " : ""}${content}`;
  };
  const cropFrameSize = 240;
  const cropPreviewScale = profileImageDimensions
    ? Math.max(cropFrameSize / profileImageDimensions.width, cropFrameSize / profileImageDimensions.height) * profileZoom
    : 1;
  const cropPreviewWidth = profileImageDimensions ? profileImageDimensions.width * cropPreviewScale : cropFrameSize;
  const cropPreviewHeight = profileImageDimensions ? profileImageDimensions.height * cropPreviewScale : cropFrameSize;
  const cropPreviewLeft = (cropFrameSize - cropPreviewWidth) / 2 + (profileCropX / 100) * ((cropPreviewWidth - cropFrameSize) / 2);
  const cropPreviewTop = (cropFrameSize - cropPreviewHeight) / 2 + (profileCropY / 100) * ((cropPreviewHeight - cropFrameSize) / 2);

  useEffect(() => {
    if (!profileImage) {
      setProfileImagePreview("");
      setProfileImageDimensions(null);
      return undefined;
    }
    const previewUrl = URL.createObjectURL(profileImage);
    setProfileImagePreview(previewUrl);
    setProfileImageDimensions(null);
    return () => URL.revokeObjectURL(previewUrl);
  }, [profileImage]);

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

  const refreshGroups = async () => {
    try {
      const response = await fetch("https://freechat-ydqe.onrender.com/api/groups", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setGroups(data);
      setselecteduser((current) => current?.isGroup
        ? data.find((group) => String(group._id) === String(current._id))
          ? { ...data.find((group) => String(group._id) === String(current._id)), isGroup: true }
          : null
        : current);
    } catch {
      // Retry on the next refresh.
    }
  };

  const refreshGroupDetails = async (groupId = selecteduser?._id) => {
    if (!groupId) return;
    try {
      const response = await fetch(`https://freechat-ydqe.onrender.com/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (response.ok && String(selectedUserIdRef.current) === String(groupId)) setGroupDetails(data);
    } catch {
      // Keep the last roster visible if the connection briefly drops.
    }
  };

  const addGroupPerson = async (userId) => {
    if (!selecteduser?.isGroup) return false;
    try {
      const response = await fetch(`https://freechat-ydqe.onrender.com/api/groups/${selecteduser._id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not add that person.");
      setGroupPhoneError("");
      await Promise.all([refreshGroupDetails(selecteduser._id), refreshGroups()]);
      return true;
    } catch (error) {
      setGroupPhoneError(error.message);
      return false;
    }
  };

  const updateGroupMemberRole = async (member, role) => {
    if (!selecteduser?.isGroup || !groupDetails?.isAdmin) return;
    setGroupActionError("");
    try {
      const response = await fetch(`https://freechat-ydqe.onrender.com/api/groups/${selecteduser._id}/members/${member._id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update member role.");
      setGroupDetails((current) => current ? { ...current, members: current.members.map((item) => String(item._id) === String(member._id) ? { ...item, role: data.role } : item) } : current);
      await refreshGroupDetails(selecteduser._id);
    } catch (error) {
      setGroupActionError(error.message);
    }
  };

  const searchGroupPerson = async (event) => {
    event.preventDefault();
    setGroupPhoneError("");
    setGroupPhoneResult(null);
    try {
      const phone = groupPhoneQuery.replace(/\D/g, "");
      const response = await fetch(`https://freechat-ydqe.onrender.com/api/friends/search?phone=${encodeURIComponent(phone)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "No account found with that number.");
      setGroupPhoneResult(data);
    } catch (error) {
      setGroupPhoneError(error.message);
    }
  };

  const removeGroupMember = async (member) => {
    if (!selecteduser?.isGroup || !window.confirm(`Remove ${member.name} from this group?`)) return;
    try {
      const response = await fetch(`https://freechat-ydqe.onrender.com/api/groups/${selecteduser._id}/members/${member._id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not remove member.");
      await refreshGroupDetails(selecteduser._id);
      await refreshGroups();
    } catch (error) {
      setGroupActionError(error.message);
    }
  };

  const leaveGroup = async () => {
    if (!selecteduser?.isGroup || !window.confirm(`Leave ${selecteduser.name}?`)) return;
    try {
      const response = await fetch(`https://freechat-ydqe.onrender.com/api/groups/${selecteduser._id}/leave`, {
        method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not leave group.");
      setselecteduser(null); setmessages([]); setGroupDetails(null); setGroupMenuOpen(false);
      await refreshGroups();
    } catch (error) { setGroupActionError(error.message); }
  };

  const clearGroupChat = async () => {
    if (!selecteduser?.isGroup || !window.confirm(`Clear your message history for ${selecteduser.name}? Other members will keep their chat history.`)) return;
    try {
      const response = await fetch(`https://freechat-ydqe.onrender.com/api/groups/${selecteduser._id}/messages`, {
        method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not clear group chat.");
      setmessages([]); setGroupMenuOpen(false); setRecentMessages((current) => ({ ...current, [selecteduser._id]: "" }));
    } catch (error) { setGroupActionError(error.message); }
  };

  const createGroup = async (event) => {
    event.preventDefault();
    setGroupActionError("");
    try {
      const response = await fetch("https://freechat-ydqe.onrender.com/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ name: groupNameDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create group.");
      const group = { ...data.group, isGroup: true };
      setGroups((current) => [data.group, ...current.filter((item) => item._id !== data.group._id)]);
      setGroupNameDraft("");
      setGroupDialogOpen(false);
      openChat(group);
    } catch (error) {
      setGroupActionError(error.message);
    }
  };

  const saveGroupSettings = async (event) => {
    event.preventDefault();
    if (!selecteduser?.isGroup || !groupDetails?.isAdmin) return;
    setSavingGroupSettings(true);
    setGroupActionError("");
    try {
      const body = new FormData();
      body.append("name", groupEditName.trim());
      body.append("description", groupEditDescription.trim());
      if (groupIconFile) body.append("groupIcon", groupIconFile);
      const response = await fetch(`https://freechat-ydqe.onrender.com/api/groups/${selecteduser._id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update group.");
      setGroups((current) => current.map((group) => String(group._id) === String(data.group._id) ? { ...group, ...data.group } : group));
      setselecteduser((current) => current && String(current._id) === String(data.group._id) ? { ...current, ...data.group, isGroup: true } : current);
      setGroupDetails((current) => current ? { ...current, name: data.group.name, description: data.group.description, icon: data.group.icon } : current);
      setGroupEditOpen(false);
      setGroupIconFile(null);
    } catch (error) {
      setGroupActionError(error.message);
    } finally {
      setSavingGroupSettings(false);
    }
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
        ? current.isGroup ? current : contacts.find((user) => String(user._id) === String(current._id)) || null
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

  const saveProfileVisibility = async (event) => {
    const nextAnonymous = !event.target.checked;
    setPhoneError("");
    setSavingPrivacy(true);
    try {
      const response = await fetch("https://freechat-ydqe.onrender.com/api/users/privacy", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ isAnonymous: nextAnonymous }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update profile visibility.");
      setIsAnonymous(nextAnonymous);
      await refreshFriendRequests();
    } catch (error) {
      setPhoneError(error.message);
    } finally {
      setSavingPrivacy(false);
    }
  };

  const saveProfileStatus = async (event) => {
    event.preventDefault();
    setStatusError("");
    setSavingStatus(true);
    try {
      const response = await fetch("https://freechat-ydqe.onrender.com/api/users/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ status: statusDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save status.");
      setMyStatus(data.status || "");
      setStatusDraft(data.status || "");
    } catch (error) {
      setStatusError(error.message);
    } finally {
      setSavingStatus(false);
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
    const groupMatch = String(decodedText || "").trim().match(/^connectgroup:([a-f\d]{24})$/i);
    if (groupMatch) {
      qrScanHandledRef.current = true;
      setQrRequestSending(true);
      setQrScanStatus("Joining group…");
      try {
        const response = await fetch(`https://freechat-ydqe.onrender.com/api/groups/${groupMatch[1]}/join`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not join this group.");
        await refreshGroups();
        setQrScanStatus(`Joined ${data.group.name}.`);
        openChat({ ...data.group, isGroup: true });
      } catch (error) {
        qrScanHandledRef.current = false;
        setQrScanStatus(error.message || "Could not join group.");
      } finally {
        setQrRequestSending(false);
      }
      return;
    }
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

  useEffect(() => {
    refreshGroups();
    const interval = window.setInterval(refreshGroups, 15000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket || !groups.length) return;
    groups.forEach((group) => socket.emit("group:join", { groupId: group._id }));
  }, [socket, groups]);

  useEffect(() => {
    let active = true;
    if (!groupQrTarget) { setGroupQrImage(""); return () => { active = false; }; }
    import("qrcode").then(({ default: QRCode }) => QRCode.toDataURL(`connectgroup:${groupQrTarget._id}`, {
      width: 280, margin: 2, color: { dark: "#172033", light: "#ffffff" }, errorCorrectionLevel: "M",
    })).then((image) => { if (active) setGroupQrImage(image); }).catch(() => { if (active) setGroupQrImage(""); });
    return () => { active = false; };
  }, [groupQrTarget]);

  useEffect(() => {
    if (!selecteduser?.isGroup) { setGroupDetails(null); return undefined; }
    void refreshGroupDetails(selecteduser._id);
    const interval = window.setInterval(() => refreshGroupDetails(selecteduser._id), 12000);
    return () => window.clearInterval(interval);
  }, [selectedUserId, selecteduser?.isGroup]);

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
      return true;
    } catch (error) {
      setFriendActionError(error.message);
      return false;
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
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const behavior = smoothScrollNextRef.current && !reduceMotion ? "smooth" : "auto";
    smoothScrollNextRef.current = false;
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
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
    const onGroupAdded = () => refreshGroups();
    const onGroupRemoved = ({ groupId }) => {
      setGroups((current) => current.filter((group) => String(group._id) !== String(groupId)));
      if (String(selectedUserIdRef.current) === String(groupId)) {
        setselecteduser(null);
        setmessages([]);
        setGroupDetails(null);
      }
    };
    const onGroupCleared = ({ groupId }) => {
      if (String(selectedUserIdRef.current) === String(groupId)) setmessages([]);
      setRecentMessages((current) => ({ ...current, [groupId]: "" }));
    };
    const onGroupMemberChange = ({ groupId }) => {
      if (String(selectedUserIdRef.current) === String(groupId)) void refreshGroupDetails(groupId);
      void refreshGroups();
    };
    const onGroupRoleUpdated = ({ groupId }) => {
      if (String(selectedUserIdRef.current) === String(groupId)) void refreshGroupDetails(groupId);
    };
    const onGroupUpdated = (group) => {
      setGroups((current) => current.map((item) => String(item._id) === String(group._id) ? { ...item, ...group } : item));
      setselecteduser((current) => current?.isGroup && String(current._id) === String(group._id) ? { ...current, ...group, isGroup: true } : current);
      setGroupDetails((current) => current && String(current._id) === String(group._id) ? { ...current, name: group.name, description: group.description, icon: group.icon } : current);
    };
    socket?.on("friendRequestReceived", onFriendRequestChange);
    socket?.on("friendRequestUpdated", onFriendRequestChange);
    socket?.on("friendshipRemoved", onFriendshipRemoved);
    socket?.on("groupAdded", onGroupAdded);
    socket?.on("groupRemoved", onGroupRemoved);
    socket?.on("groupCleared", onGroupCleared);
    socket?.on("groupMemberLeft", onGroupMemberChange);
    socket?.on("groupUpdated", onGroupUpdated);
    socket?.on("groupRoleUpdated", onGroupRoleUpdated);
    return () => {
      window.clearInterval(refreshInterval);
      socket?.off("friendRequestReceived", onFriendRequestChange);
      socket?.off("friendRequestUpdated", onFriendRequestChange);
      socket?.off("friendshipRemoved", onFriendshipRemoved);
      socket?.off("groupAdded", onGroupAdded);
      socket?.off("groupRemoved", onGroupRemoved);
      socket?.off("groupCleared", onGroupCleared);
      socket?.off("groupMemberLeft", onGroupMemberChange);
      socket?.off("groupUpdated", onGroupUpdated);
      socket?.off("groupRoleUpdated", onGroupRoleUpdated);
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
          return [user._id, count, history.length ? messagePreview(history[history.length - 1]) : "No messages yet"];
        }),
      );
      if (!isActive) return;
      const previews = {};
      results.forEach((result) => { if (result.status === "fulfilled") previews[result.value[0]] = result.value[2]; });
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
      setRecentMessages((current) => ({ ...current, ...previews }));
    };
    loadUnreadCounts();
    return () => {
      isActive = false;
    };
  }, [userIdsKey]);

  useEffect(() => {
    if (!groups.length) return undefined;
    let active = true;
    const loadGroupPreviews = async () => {
      const results = await Promise.allSettled(groups.map(async (group) => {
        const response = await fetch(`https://freechat-ydqe.onrender.com/api/messages/group/${group._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!response.ok) throw new Error("Could not load group preview");
        const history = await response.json();
        return [group._id, history.length ? messagePreview(history[history.length - 1]) : "No messages yet"];
      }));
      if (!active) return;
      setRecentMessages((current) => {
        const next = { ...current };
        results.forEach((result) => { if (result.status === "fulfilled") next[result.value[0]] = result.value[1]; });
        return next;
      });
    };
    void loadGroupPreviews();
    return () => { active = false; };
  }, [groups.map((group) => group._id).join(",")]);

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
        setselecteduser((currentUser) => currentUser
          ? currentUser.isGroup
            ? currentUser
            : data.find((user) => user._id === currentUser._id) || null
          : currentUser);
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
    const onPresenceUpdate = ({ userId, isOnline, lastSeen, isAnonymous }) => {
      const normalizedUserId = String(userId);
      const updatePresence = (user) =>
        String(user._id) === normalizedUserId
          ? {
              ...user,
              ...(isAnonymous ? { name: "Anonymous", email: "", profileImage: "", isAnonymous: true, lastSeen: null } : {}),
              isOnline: isAnonymous ? false : isOnline,
              ...(lastSeen && !isAnonymous ? { lastSeen } : {}),
            }
          : user;

      setusers((currentUsers) => currentUsers.map(updatePresence));
      setselecteduser((currentUser) =>
        currentUser ? updatePresence(currentUser) : currentUser,
      );
    };

    const onProfilePrivacyChanged = (profile) => {
      const updateProfile = (user) => String(user._id) === String(profile.userId)
        ? { ...user, ...profile }
        : user;
      setusers((currentUsers) => currentUsers.map(updateProfile));
      setselecteduser((currentUser) => currentUser ? updateProfile(currentUser) : currentUser);
    };

    const onProfileStatusChanged = ({ userId, status }) => {
      const updateStatus = (user) => String(user._id) === String(userId)
        ? { ...user, status: user.isAnonymous ? "" : status }
        : user;
      setusers((currentUsers) => currentUsers.map(updateStatus));
      setselecteduser((currentUser) => currentUser ? updateStatus(currentUser) : currentUser);
    };

    socket.on("presenceUpdate", onPresenceUpdate);
    socket.on("profilePrivacyChanged", onProfilePrivacyChanged);
    socket.on("profileStatusChanged", onProfileStatusChanged);
    return () => {
      socket.off("presenceUpdate", onPresenceUpdate);
      socket.off("profilePrivacyChanged", onProfilePrivacyChanged);
      socket.off("profileStatusChanged", onProfileStatusChanged);
    };
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
    if (selecteduser?.isGroup) return undefined;
    return () => emitTypingUpdate(selectedUserId, "");
  }, [socket, selectedUserId, selecteduser?.isGroup]);

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
        setMyStatus(data.status || "");
        setStatusDraft(data.status || "");
        setIsAnonymous(Boolean(data.isAnonymous));
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
          `https://freechat-ydqe.onrender.com/api/messages/${selecteduser?.isGroup ? `group/${selectedUserId}` : selectedUserId}`,
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
      if (!selecteduser?.isGroup) data.forEach((message) => {
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
  }, [selectedUserId, socket, selecteduser?.isGroup]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("profileName");
    navigate("/");
  };

  const uploadProfileImage = async (fileToUpload = profileImage) => {
    if (!fileToUpload) return false;

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
        setProfileImageError(data.message || "Could not upload your profile photo.");
        return false;
      }

      setMyProfileImage(data.user.profileImage);
      setProfileImage(null);
      setProfileImageError("");

      return true;
    } catch (error) {
      setProfileImageError(error.message || "Could not upload your profile photo.");
      return false;
    }
  };

  const saveCroppedProfileImage = async () => {
    if (!profileImagePreview) return;
    setSavingProfileImage(true);
    setProfileImageError("");
    try {
      const image = new Image();
      image.src = profileImagePreview;
      await image.decode();
      const size = 512;
      const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * profileZoom;
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const drawX = (size - drawWidth) / 2 + (profileCropX / 100) * ((drawWidth - size) / 2);
      const drawY = (size - drawHeight) / 2 + (profileCropY / 100) * ((drawHeight - size) / 2);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare the cropped image.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size, size);
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not crop this image.")), "image/jpeg", 0.92));
      const croppedImage = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
      await uploadProfileImage(croppedImage);
    } catch (error) {
      setProfileImageError(error.message || "This image could not be opened for cropping.");
    } finally {
      setSavingProfileImage(false);
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
    if (!selecteduser || (!text.trim() && !file)) {
      return;
    }
    try {
      setComposerError("");
      const token = localStorage.getItem("token");
      const body = file ? new FormData() : JSON.stringify({
        ...(selecteduser.isGroup ? { groupId: selecteduser._id } : { receiverId: selecteduser._id }),
        message: text,
        replyTo: replyingTo?._id || null,
      });
      if (file) {
        body.append(selecteduser.isGroup ? "groupId" : "receiverId", selecteduser._id);
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
      smoothScrollNextRef.current = true;
      setmessages((prevMessages) => prevMessages.some((item) => String(item._id) === String(data.data._id)) ? prevMessages : [...prevMessages, data.data]);
      setRecentMessages((current) => ({ ...current, [selecteduser._id]: messagePreview(data.data) }));
      setnewMessage("");
      if (!selecteduser.isGroup) emitTypingUpdate(selecteduser._id, "");
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
    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
    ];
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
          const connectionFailed = peerConnection.connectionState === "failed";
          peerConnectionRef.current.delete(String(peerUserId));
          setRemoteStreams((current) => {
            const next = { ...current };
            delete next[String(peerUserId)];
            return next;
          });
          const currentCall = callSessionRef.current;
          const participants = (currentCall.participants || []).filter((id) => String(id) !== String(peerUserId));
          setActiveCall({ ...currentCall, participants });
          if (participants.length <= 1) {
            cleanupCall();
            if (connectionFailed) {
              setCallNotice("The call could not connect on this network. A TURN relay may be needed for mobile or restricted networks.");
            }
          }
        }
      }
    };
    return peerConnection;
  };

  const startCall = async (callType, callTarget = selecteduser) => {
    if (!callTarget || !socket?.connected || callSessionRef.current) {
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
        },
        video: callType === "video" ? {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        } : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const activeCall = {
        callId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        peerUserId: String(callTarget._id),
        peerName: callTarget.name,
        callType,
        status: "calling",
        isCaller: true,
        participants: [currentUserId, String(callTarget._id)],
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

  const startGroupCall = (callType) => {
    const peer = groupDetails?.members?.find((member) => member.isFriend && member._id !== String(currentUserId));
    if (!peer) {
      setGroupActionError("Add a friend to this group before starting a call.");
      return;
    }
    startCall(callType, { _id: peer._id, name: peer.name });
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
        },
        video: activeCall.callType === "video" ? {
          facingMode: { ideal: "user" },
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
      groups.forEach((group) => newSocket.emit("group:join", { groupId: group._id }));
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("receiveMessage", (data) => {
      const senderId = String(data.sender?._id || data.sender);
      const receiverIdForPreview = String(data.receiver?._id || data.receiver);
      const chatId = senderId === String(currentUserId) ? receiverIdForPreview : senderId;
      setRecentMessages((current) => ({ ...current, [chatId]: messagePreview(data) }));
      if (senderId === String(currentUserId)) {
        if (receiverIdForPreview === String(selectedUserId)) {
          smoothScrollNextRef.current = true;
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
      smoothScrollNextRef.current = true;
      setmessages((prevMessages) => [...prevMessages, data]);
    });

    const onGroupMessage = (data) => {
      const groupId = String(data.group?._id || data.group);
      if (String(selectedUserIdRef.current) === groupId) {
        smoothScrollNextRef.current = true;
        setmessages((current) => current.some((item) => String(item._id) === String(data._id)) ? current : [...current, data]);
      } else {
        if (String(data.sender?._id || data.sender) === String(currentUserId)) return;
        setUnreadCounts((current) => ({ ...current, [groupId]: (current[groupId] || 0) + 1 }));
      }
      setRecentMessages((current) => ({ ...current, [groupId]: messagePreview(data) }));
    };
    socket.on("groupMessage", onGroupMessage);

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
      socket.off("groupMessage", onGroupMessage);
      socket.off("messageStatusUpdated");
    };
  }, [socket, selectedUserId, currentUserId]);

  useEffect(() => {
    let active = true;
    if (!qrToolsOpen || qrTab !== "show" || !currentUserId) return () => { active = false; };
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
  }, [qrToolsOpen, qrTab, currentUserId, qrGenerationAttempt]);

  useEffect(() => {
    if (!qrToolsOpen || qrTab !== "scan") return undefined;
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
  }, [qrToolsOpen, qrTab]);

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
                  setProfileZoom(1);
                  setProfileCropX(0);
                  setProfileCropY(0);
                  setProfileImageError("");
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
              <AvatarPhoto src={getImageUrl(myProfileImage)} name={profileName} alt="My profile" />
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
            <Tooltip title="Create a group" placement="right">
              <IconButton className="rail-button" aria-label="Create a group" onClick={() => { setGroupActionError(""); setGroupDialogOpen(true); }}>
                <GroupRounded />
              </IconButton>
            </Tooltip>
            <Tooltip title="Scan a friend QR code" placement="right">
              <IconButton className="rail-button" aria-label="Scan or show a QR code" onClick={() => { setQrScanStatus(""); setQrTab("scan"); setQrToolsOpen(true); }}>
                <QrCodeScannerRounded />
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
              {groups.map((group) => (
                <div key={`group-${group._id}`} onClick={() => openChat({ ...group, isGroup: true })}
                  className={`chat-contact-item flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selecteduser?._id === group._id ? "chat-contact-active" : "chat-contact-hover"}`}>
                  <Avatar className="contact-avatar w-10 h-10 rounded-full flex items-center justify-center font-medium">{group.icon ? <AvatarPhoto src={getImageUrl(group.icon)} name={group.name} /> : <GroupRounded />}</Avatar>
                  <div className="flex-1 min-w-0"><h3 className="font-medium text-[15px] truncate">{group.name}</h3><p className="contact-email text-[13px] truncate">{recentMessages[group._id] || "No messages yet"}</p></div>
                  {unreadCounts[group._id] > 0 && <span className="contact-unread-badge">{unreadCounts[group._id] > 99 ? "99+" : unreadCounts[group._id]}</span>}
                </div>
              ))}
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
                      <AvatarPhoto src={getImageUrl(user.profileImage)} name={user.name} />
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
                    <p className="contact-email text-[13px] truncate">{recentMessages[user._id] || "No messages yet"}</p>
                  </div>
                </div>
              ))}
              {!visibleUsers.length && !groups.length && (
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
                        {selecteduser.isGroup ? selecteduser.icon ? <AvatarPhoto src={getImageUrl(selecteduser.icon)} name={selecteduser.name} /> : <GroupRounded /> : <AvatarPhoto src={getImageUrl(selecteduser.profileImage)} name={selecteduser.name} />}
                      </Avatar>
                      {!selecteduser.isGroup && selecteduser.isOnline && (
                        <span className="contact-status-dot"></span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-[16px] font-medium leading-tight">
                        {selecteduser.name}
                      </h2>
                      {selecteduser.isGroup
                        ? <p className="group-member-count">{groupDetails?.memberCount || selecteduser.members?.length || 1} members</p>
                        : !selecteduser.isAnonymous && selecteduser.status && <p className="chat-header-status">{selecteduser.status}</p>}
                    </div>
                  </div>
                  {selecteduser.isGroup ? (
                    <div className="group-menu-wrap">
                      <Tooltip title="Group video call"><IconButton className="chat-call-button group-video-call-button" aria-label="Start group video call" onClick={() => startGroupCall("video")}><VideocamRounded /></IconButton></Tooltip>
                      <Tooltip title="Group options"><IconButton className="chat-call-button" aria-label="Group options" aria-expanded={groupMenuOpen} onClick={() => setGroupMenuOpen((open) => !open)}><MoreVertRounded /></IconButton></Tooltip>
                      {groupMenuOpen && <div className="group-header-menu" role="menu" aria-label="Group options">
                        <button type="button" role="menuitem" onClick={() => { setGroupMenuOpen(false); setAddPeopleTab("phone"); setGroupPhoneError(""); setGroupPhoneResult(null); setAddPeopleOpen(true); }}><PersonAddAlt1Rounded />Add people</button>
                        <button type="button" role="menuitem" onClick={() => { setGroupMenuOpen(false); setGroupQrTarget(selecteduser); }}><QrCodeRounded />Show group QR</button>
                        <button type="button" role="menuitem" onClick={() => { setGroupMenuOpen(false); startGroupCall("audio"); }}><CallRounded />Voice call</button>
                        {groupDetails?.isAdmin && <button type="button" role="menuitem" onClick={() => { setGroupMenuOpen(false); setGroupEditName(selecteduser.name); setGroupEditDescription(groupDetails?.description || selecteduser.description || ""); setGroupIconFile(null); setGroupActionError(""); setGroupEditOpen(true); }}><EditRounded />Edit group details</button>}
                        <button type="button" role="menuitem" onClick={() => { setGroupMenuOpen(false); setGroupDetailsOpen(true); void refreshGroupDetails(selecteduser._id); }}><GroupRounded />Group details</button>
                        <button type="button" role="menuitem" onClick={() => void clearGroupChat()}><CloseRounded />Clear chat</button>
                        <button type="button" role="menuitem" className="group-menu-danger" onClick={() => void leaveGroup()}><LogoutRounded />Leave group</button>
                      </div>}
                    </div>
                  ) : <div className="chat-call-actions" aria-label="Call options">
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
                  </div>}
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
                                  {selecteduser.isGroup ? <AvatarPhoto src={getImageUrl(msg.sender?.profileImage)} name={msg.sender?.name} /> : <AvatarPhoto src={getImageUrl(selecteduser.profileImage)} name={selecteduser.name} />}
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
                            {selecteduser.isGroup && !isSentByMe && (
                              <button type="button" className="group-message-author" onClick={() => setGroupMemberProfile(msg.sender)}>{msg.sender?.name || "Anonymous"}</button>
                            )}
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
                            gifInputRef.current?.click();
                          }}
                        >
                          <GifRounded />
                          GIF
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
                      accept="image/*,.heic,.heif,.avif"
                      tabIndex={-1}
                      aria-label="Choose photos from your gallery"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) sendMessage(newMessage, file);
                        event.target.value = "";
                      }}
                    />
                    <input
                      ref={gifInputRef}
                      className="visually-hidden-file"
                      type="file"
                      accept="image/gif,.gif"
                      tabIndex={-1}
                      aria-label="Choose a GIF"
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
                      enterKeyHint="send"
                      maxLength={1000}
                      placeholder="Write a message..."
                      aria-label="Write a message"
                      className="chat-message-input w-full rounded-full py-3 pl-4 pr-12 text-sm focus:outline-none"
                      value={newMessage}
                      onChange={(event) => {
                        const text = event.target.value;
                        setnewMessage(text);
                        if (!selecteduser.isGroup) emitTypingUpdate(selecteduser._id, text);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
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
                      {selecteduser.isGroup ? selecteduser.icon ? <AvatarPhoto src={getImageUrl(selecteduser.icon)} name={selecteduser.name} /> : <GroupRounded /> : <AvatarPhoto src={getImageUrl(selecteduser.profileImage)} name={selecteduser.name} />}
                    </Avatar>
                    {!selecteduser.isGroup && selecteduser.isOnline && (
                      <span className="contact-status-dot profile-status-dot"></span>
                    )}
                  </div>
                  <h2 className="text-lg font-medium">{selecteduser.name}</h2>
                  {selecteduser.isGroup && <p className="profile-presence">{groupDetails?.memberCount || selecteduser.members?.length || 1} members</p>}
                </div>
                <div className="profile-details">
                  {selecteduser.isGroup ? <>
                    <section className="group-description-panel" aria-label="Group description"><h3>Group description</h3><p>{groupDetails?.description || selecteduser.description || "No description has been added."}</p></section>
                    <div className="group-details-heading"><div><h3>Group members</h3><small>{groupDetails?.memberCount || selecteduser.members?.length || 1} people · {groupDetails?.onlineCount || 0} online</small></div><div><button type="button" onClick={() => setGroupDetailsOpen(true)}>View all</button>{groupDetails?.isAdmin && <button type="button" onClick={() => { setGroupEditName(selecteduser.name); setGroupEditDescription(groupDetails?.description || selecteduser.description || ""); setGroupIconFile(null); setGroupActionError(""); setGroupEditOpen(true); }}>Edit group</button>}</div></div>
                    {groupDetails?.isAdmin && <p className="group-role-help">One Leader, up to 7 Co-leaders, and unlimited Elders and Members.</p>}
                    <div className="group-member-list">
                      {(groupDetails?.members || []).slice(0, 6).map((member) => <div className="group-member-row" key={member._id}>
                        <button className="group-member-person" type="button" onClick={() => setGroupMemberProfile(member)}>
                          <span className="relative"><Avatar className="group-member-avatar"><AvatarPhoto src={getImageUrl(member.profileImage)} name={member.name} /></Avatar>{member.isOnline && <i className="group-online-dot" />}</span>
                          <strong>{member.name}</strong>
                        </button>
                        {member._id === String(groupDetails?.creator) ? <span className="group-admin-badge">Leader</span> : groupDetails?.isAdmin ? <select className="group-role-select" aria-label={`Role for ${member.name}`} value={member.role || "Member"} onChange={(event) => void updateGroupMemberRole(member, event.target.value)}><option>Member</option><option>Elder</option><option disabled={groupCoLeaderCount >= 7 && member.role !== "Co-leader"}>Co-leader</option>{String(groupDetails?.creator) === String(currentUserId) && <option>Leader</option>}</select> : <span className={member.isAdmin ? "group-admin-badge" : "group-role-badge"}>{member.role || "Member"}</span>}
                        {groupDetails?.isAdmin && !member.isAdmin && <IconButton className="group-remove-button" aria-label={`Remove ${member.name}`} title="Remove from group" onClick={() => void removeGroupMember(member)}><CloseRounded /></IconButton>}
                      </div>)}
                    </div>
                    {groupActionError && <p className="friend-action-error" role="alert">{groupActionError}</p>}
                  </> : <><h3>Contact details</h3>{!selecteduser.isAnonymous && <div className="profile-detail-row">
                    <span>Email address</span>
                    <strong>{selecteduser.email}</strong>
                  </div>}
                  {selecteduser.isAnonymous && <p className="anonymous-profile-note">This person chose to keep their profile private.</p>}
                  <button className="unfriend-button" type="button" onClick={() => unfriend(selecteduser)}>
                    Remove friend
                  </button>
                  </>}
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
      {qrToolsOpen && (
        <div className="contact-picker-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setQrToolsOpen(false);
        }}>
          <section className="contact-picker qr-dialog" role="dialog" aria-modal="true" aria-labelledby="qr-tools-title">
            <header className="contact-picker-header">
              <div><p className="chat-overline">CONNECT</p><h2 id="qr-tools-title">Connect with a QR code</h2><p>{qrTab === "scan" ? "Scan someone’s code to send them a friend request." : "Let someone scan your code to request to connect."}</p></div>
              <IconButton className="contact-picker-close" aria-label="Close QR options" onClick={() => setQrToolsOpen(false)}><CloseRounded /></IconButton>
            </header>
            <div className="qr-tabs" role="tablist" aria-label="QR code options">
              <button type="button" role="tab" aria-selected={qrTab === "scan"} className={qrTab === "scan" ? "active" : ""} onClick={() => { setQrScanStatus(""); setQrTab("scan"); }}><QrCodeScannerRounded /> Scan</button>
              <button type="button" role="tab" aria-selected={qrTab === "show"} className={qrTab === "show" ? "active" : ""} onClick={() => { setQrScanStatus(""); setQrTab("show"); }}><QrCodeRounded /> My QR</button>
            </div>
            {qrTab === "scan" ? (
              <>
                <div id="connect-qr-reader" className="connect-qr-reader" />
                {qrScanStatus && <p className="qr-help-text" role="status">{qrScanStatus}</p>}
              </>
            ) : (
              <>
                {myQrImage ? <img className="my-friend-qr" src={myQrImage} alt={`Unique Connect QR code for ${profileName}`} /> : <div className="qr-generation-state"><p className="contact-picker-empty">{qrScanStatus || "Creating your QR code…"}</p>{qrScanStatus && <button type="button" onClick={() => { setQrScanStatus(""); setQrGenerationAttempt((attempt) => attempt + 1); }}>Try again</button>}</div>}
                <strong className="qr-account-name">{profileName}</strong>
                <p className="qr-help-text">Friend requests need your approval before messaging can begin.</p>
              </>
            )}
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
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Enter mobile number, including country code"
              value={contactQuery}
              onChange={(event) => setContactQuery(event.target.value)}
              style={{ color: "#fff", WebkitTextFillColor: "#fff", caretColor: "#fff", backgroundColor: "rgba(255,255,255,.12)", fontWeight: 600, opacity: 1 }}
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
                    <IconButton title="Accept friend request" aria-label="Accept friend request" onClick={() => acceptFriendRequest(searchResult.requestId, searchResult.user)}><CheckRounded /></IconButton>
                  ) : (
                    <IconButton title="Send friend request" aria-label="Send friend request" onClick={() => sendFriendRequest(searchResult.user)}><PersonAddAlt1Rounded /></IconButton>
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
                <IconButton title="Accept friend request" aria-label="Accept friend request" onClick={() => acceptFriendRequest(request._id, request.sender)}><CheckRounded /></IconButton>
                <IconButton title="Reject friend request" aria-label="Reject friend request" className="request-decline" onClick={() => rejectFriendRequest(request._id)}><CloseRounded /></IconButton>
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
              <div><p className="chat-overline">ACCOUNT</p><h2 id="phone-setup-title">Account settings</h2><p>Manage your photo, status, visibility, and mobile number.</p></div>
              <IconButton className="contact-picker-close" aria-label="Close account settings" onClick={() => setPhoneDialogOpen(false)}><CloseRounded /></IconButton>
            </header>
            <div className="account-photo-setting">
              <Avatar className="account-photo-avatar"><AvatarPhoto src={getImageUrl(myProfileImage)} name={profileName} alt="My profile" /></Avatar>
              <div className="account-photo-copy"><strong>Profile picture</strong><span>Choose and adjust how your photo appears.</span></div>
              <button type="button" className="account-photo-change" onClick={() => document.getElementById("profile-image-input")?.click()}>Change</button>
            </div>
            <label className="privacy-switch-row">
              <span><strong>Show my profile</strong><small>When off, friends see “Anonymous” with no photo, status, or profile details.</small></span>
              <input type="checkbox" role="switch" checked={!isAnonymous} onChange={saveProfileVisibility} disabled={savingPrivacy} />
            </label>
            <form className="account-status-form" onSubmit={saveProfileStatus}>
              <label className="account-phone-label" htmlFor="account-status">Status</label>
              <textarea id="account-status" className="contact-picker-search account-status-input" maxLength={160} rows={3} placeholder="Share a short status with your friends" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)} />
              <div className="account-status-footer"><small>{myStatus ? `Current status: ${myStatus.length} characters` : "Visible beneath your name in one-to-one chats"} · {statusDraft.length}/160</small><button className="phone-save-button" type="submit" disabled={savingStatus}>{savingStatus ? "Saving…" : "Save status"}</button></div>
              {statusError && <p className="friend-action-error" role="alert">{statusError}</p>}
            </form>
            {phoneError && <p className="friend-action-error" role="alert">{phoneError}</p>}
            <form onSubmit={savePhoneNumber}>
              <label className="account-phone-label" htmlFor="account-phone-number">Mobile number</label>
              <input id="account-phone-number" className="contact-picker-search" type="tel" inputMode="tel" autoComplete="tel" placeholder="Include your country code" value={phoneDraft} onChange={(event) => setPhoneDraft(event.target.value)} required />
              <button className="phone-save-button" type="submit">Save mobile number</button>
            </form>
          </section>
        </div>
      )}
      {groupDialogOpen && (
        <div className="contact-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGroupDialogOpen(false); }}>
          <section className="contact-picker group-create-dialog" role="dialog" aria-modal="true" aria-labelledby="group-create-title">
            <header className="contact-picker-header"><div><p className="chat-overline">NEW GROUP</p><h2 id="group-create-title">Create a group</h2><p>Give your group a name. Share its QR code so anyone can join.</p></div><IconButton className="contact-picker-close" aria-label="Close group creation" onClick={() => setGroupDialogOpen(false)}><CloseRounded /></IconButton></header>
            <form onSubmit={createGroup}><label className="account-phone-label" htmlFor="group-name-input">Group name</label><input id="group-name-input" className="contact-picker-search" autoFocus maxLength={60} placeholder="For example, Weekend plans" value={groupNameDraft} onChange={(event) => setGroupNameDraft(event.target.value)} required />{groupActionError && <p className="friend-action-error" role="alert">{groupActionError}</p>}<button className="phone-save-button" type="submit">Create group</button></form>
          </section>
        </div>
      )}
      {groupEditOpen && selecteduser?.isGroup && groupDetails?.isAdmin && (
        <div className="contact-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingGroupSettings) setGroupEditOpen(false); }}>
          <section className="contact-picker group-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="group-edit-title">
            <header className="contact-picker-header"><div><p className="chat-overline">ADMIN SETTINGS</p><h2 id="group-edit-title">Edit group</h2><p>Only the group admin can change its name, icon, and description.</p></div><IconButton className="contact-picker-close" aria-label="Close group settings" onClick={() => setGroupEditOpen(false)} disabled={savingGroupSettings}><CloseRounded /></IconButton></header>
            <form onSubmit={saveGroupSettings}>
              <div className="group-edit-icon-row"><Avatar className="group-edit-icon">{groupIconFile ? <PhotoCameraRounded /> : selecteduser.icon ? <AvatarPhoto src={getImageUrl(selecteduser.icon)} name={selecteduser.name} /> : <GroupRounded />}</Avatar><div className="group-edit-icon-copy"><strong>Group icon</strong><small>{groupIconFile?.name || "Choose a JPG, PNG, or WEBP image (5 MB max)."}</small></div><label className="group-icon-select">Change<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setGroupIconFile(event.target.files?.[0] || null)} /></label></div>
              <label className="account-phone-label" htmlFor="group-edit-name">Group name</label><input id="group-edit-name" className="contact-picker-search" maxLength={60} value={groupEditName} onChange={(event) => setGroupEditName(event.target.value)} required />
              <label className="account-phone-label" htmlFor="group-edit-description">Group description</label><textarea id="group-edit-description" className="contact-picker-search group-description-input" maxLength={500} rows={4} placeholder="What is this group about?" value={groupEditDescription} onChange={(event) => setGroupEditDescription(event.target.value)} /><small className="group-description-counter">{groupEditDescription.length}/500</small>
              {groupActionError && <p className="friend-action-error" role="alert">{groupActionError}</p>}
              <button className="phone-save-button" type="submit" disabled={savingGroupSettings}>{savingGroupSettings ? "Saving…" : "Save group"}</button>
            </form>
          </section>
        </div>
      )}
      {groupQrTarget && (
        <div className="contact-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGroupQrTarget(null); }}>
          <section className="contact-picker qr-dialog" role="dialog" aria-modal="true" aria-labelledby="group-qr-title">
            <header className="contact-picker-header"><div><p className="chat-overline">GROUP INVITE</p><h2 id="group-qr-title">{groupQrTarget.name}</h2><p>Anyone who scans this code can join this group.</p></div><IconButton className="contact-picker-close" aria-label="Close group QR code" onClick={() => setGroupQrTarget(null)}><CloseRounded /></IconButton></header>
            {groupQrImage ? <img className="my-friend-qr" src={groupQrImage} alt={`QR code to join ${groupQrTarget.name}`} /> : <p className="contact-picker-empty">Creating group QR code…</p>}
            <p className="qr-help-text">Open the QR scanner from the left sidebar and scan this invite to join.</p>
          </section>
        </div>
      )}
      {addPeopleOpen && selecteduser?.isGroup && (
        <div className="contact-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddPeopleOpen(false); }}>
          <section className="contact-picker group-people-dialog" role="dialog" aria-modal="true" aria-labelledby="group-people-title">
            <header className="contact-picker-header"><div><p className="chat-overline">{selecteduser.name}</p><h2 id="group-people-title">Add people</h2><p>Add an existing friend or look them up by mobile number.</p></div><IconButton className="contact-picker-close" aria-label="Close add people" onClick={() => setAddPeopleOpen(false)}><CloseRounded /></IconButton></header>
            <div className="group-add-tabs" role="tablist" aria-label="Add people options">
              <button type="button" className={addPeopleTab === "friends" ? "active" : ""} onClick={() => setAddPeopleTab("friends")}>Friends</button>
              <button type="button" className={addPeopleTab === "phone" ? "active" : ""} onClick={() => setAddPeopleTab("phone")}>Phone</button>
            </div>
            {addPeopleTab === "friends" && <div className="group-add-friend-list">
              {users.length ? users.map((friend) => {
                const alreadyInGroup = groupDetails?.members?.some((member) => String(member._id) === String(friend._id));
                return <div className="group-add-friend-row" key={friend._id}><span className="relative"><Avatar className="group-member-avatar"><AvatarPhoto src={getImageUrl(friend.profileImage)} name={friend.name} /></Avatar>{friend.isOnline && <i className="group-online-dot" />}</span><span className="contact-picker-user"><strong>{friend.name}</strong><small>{alreadyInGroup ? "Already in the group" : "Friend"}</small></span><IconButton title={alreadyInGroup ? "Already in group" : "Add to group"} aria-label={alreadyInGroup ? "Already in group" : `Add ${friend.name} to group`} disabled={alreadyInGroup} onClick={() => void addGroupPerson(friend._id)}><PersonAddAlt1Rounded /></IconButton></div>;
              }) : <p className="contact-picker-empty">You do not have any friends to add yet.</p>}
            </div>}
            {addPeopleTab === "phone" && <>
              <form className="group-phone-search" onSubmit={searchGroupPerson}><label className="account-phone-label" htmlFor="group-add-phone">Search by mobile number</label><div><input id="group-add-phone" className="contact-picker-search" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. +1 555 123 4567" value={groupPhoneQuery} onChange={(event) => setGroupPhoneQuery(event.target.value)} required /><button className="group-phone-submit" type="submit"><SearchRounded /><span>Search</span></button></div></form>
              {groupPhoneResult?.user && <div className="group-add-friend-row"><Avatar className="group-member-avatar"><AvatarPhoto src={getImageUrl(groupPhoneResult.user.profileImage)} name={groupPhoneResult.user.name} /></Avatar><span className="contact-picker-user"><strong>{groupPhoneResult.user.name}</strong><small>{groupPhoneResult.relationship === "friends" ? "Friend" : groupPhoneResult.relationship === "incoming" ? "Friend request received" : groupPhoneResult.relationship === "outgoing" ? "Request pending" : "Not a friend yet"}</small></span>
                {groupPhoneResult.relationship === "friends" ? <IconButton title="Add friend to group" aria-label="Add friend to group" onClick={() => void addGroupPerson(groupPhoneResult.user._id)}><PersonAddAlt1Rounded /></IconButton> : groupPhoneResult.relationship === "incoming" ? <><IconButton title="Accept request and add to group" aria-label="Accept request and add to group" onClick={async () => { if (await acceptFriendRequest(groupPhoneResult.requestId, groupPhoneResult.user)) await addGroupPerson(groupPhoneResult.user._id); }}><CheckRounded /></IconButton><IconButton title="Reject friend request" aria-label="Reject friend request" onClick={() => void rejectFriendRequest(groupPhoneResult.requestId)}><CloseRounded /></IconButton></> : groupPhoneResult.relationship === "outgoing" ? <IconButton title="Request pending" aria-label="Request pending" disabled><CheckRounded /></IconButton> : <IconButton title="Send friend request" aria-label="Send friend request" onClick={() => void sendFriendRequest(groupPhoneResult.user)}><PersonAddAlt1Rounded /></IconButton>}
              </div>}
            </>}
            {groupPhoneError && <p className="friend-action-error" role="alert">{groupPhoneError}</p>}
          </section>
        </div>
      )}
      {groupDetailsOpen && selecteduser?.isGroup && (
        <div className="contact-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGroupDetailsOpen(false); }}>
          <section className="contact-picker group-details-dialog" role="dialog" aria-modal="true" aria-labelledby="group-details-title">
            <header className="contact-picker-header"><div><p className="chat-overline">GROUP DETAILS</p><h2 id="group-details-title">{selecteduser.name}</h2><p>{groupDetails?.memberCount || 0} members · {groupDetails?.onlineCount || 0} online</p></div><IconButton className="contact-picker-close" aria-label="Close group details" onClick={() => setGroupDetailsOpen(false)}><CloseRounded /></IconButton></header>
            <div className="group-member-list group-member-list-full">{(groupDetails?.members || []).map((member) => <div className="group-member-row" key={member._id}>
              <button className="group-member-person" type="button" onClick={() => setGroupMemberProfile(member)}><span className="relative"><Avatar className="group-member-avatar"><AvatarPhoto src={getImageUrl(member.profileImage)} name={member.name} /></Avatar>{member.isOnline && <i className="group-online-dot" />}</span><strong>{member.name}</strong></button>
              {member._id === String(groupDetails?.creator) ? <span className="group-admin-badge">Leader</span> : groupDetails?.isAdmin ? <select className="group-role-select" aria-label={`Role for ${member.name}`} value={member.role || "Member"} onChange={(event) => void updateGroupMemberRole(member, event.target.value)}><option>Member</option><option>Elder</option><option disabled={groupCoLeaderCount >= 7 && member.role !== "Co-leader"}>Co-leader</option>{String(groupDetails?.creator) === String(currentUserId) && <option>Leader</option>}</select> : <span className={member.isAdmin ? "group-admin-badge" : "group-role-badge"}>{member.role || "Member"}</span>}
              {groupDetails?.isAdmin && !member.isAdmin && <IconButton className="group-remove-button" title="Remove member" aria-label={`Remove ${member.name}`} onClick={() => void removeGroupMember(member)}><CloseRounded /></IconButton>}
            </div>)}</div>
            {groupActionError && <p className="friend-action-error" role="alert">{groupActionError}</p>}
          </section>
        </div>
      )}
      {groupMemberProfile && selecteduser?.isGroup && (
        <div className="contact-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGroupMemberProfile(null); }}>
          <section className="contact-picker group-member-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="group-member-profile-title">
            <header className="contact-picker-header"><div><p className="chat-overline">GROUP MEMBER</p><h2 id="group-member-profile-title">{groupMemberProfile.name || "Anonymous"}</h2><p>{groupMemberProfile.isAdmin ? "Group admin" : "Member"}</p></div><IconButton className="contact-picker-close" aria-label="Close member profile" onClick={() => setGroupMemberProfile(null)}><CloseRounded /></IconButton></header>
            <div className="group-member-profile-main"><span className="relative"><Avatar className="group-member-profile-avatar"><AvatarPhoto src={getImageUrl(groupMemberProfile.profileImage)} name={groupMemberProfile.name} /></Avatar>{groupMemberProfile.isOnline && <i className="group-online-dot" />}</span><strong>{groupMemberProfile.name || "Anonymous"}</strong><small>{groupMemberProfile.isAnonymous ? "Profile details are private" : selectedGroupMemberIsFriend ? "Friend" : "Not your friend"}</small>
              {incomingGroupFriendRequest ? <div className="group-profile-request-actions"><IconButton className="group-profile-add-button" title="Accept friend request" aria-label="Accept friend request" onClick={async () => { await acceptFriendRequest(incomingGroupFriendRequest._id, groupMemberProfile); await refreshGroupDetails(selecteduser._id); }}><CheckRounded /></IconButton><IconButton className="group-profile-reject-button" title="Reject friend request" aria-label="Reject friend request" onClick={() => void rejectFriendRequest(incomingGroupFriendRequest._id)}><CloseRounded /></IconButton></div> : outgoingGroupFriendRequest ? <IconButton className="group-profile-add-button" title="Friend request pending" aria-label="Friend request pending" disabled><CheckRounded /></IconButton> : !selectedGroupMemberIsFriend && <IconButton className="group-profile-add-button" title="Send friend request" aria-label="Send friend request" onClick={async () => { try { const response = await fetch("https://freechat-ydqe.onrender.com/api/friends/requests", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ userId: groupMemberProfile._id }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Could not send request."); setGroupMemberProfile((current) => ({ ...current, requestSent: true })); await refreshFriendRequests(); } catch (error) { setGroupPhoneError(error.message); } }} disabled={groupMemberProfile.requestSent}><PersonAddAlt1Rounded /></IconButton>}
              {groupMemberProfile.requestSent && <small>Friend request sent</small>}
            </div>
          </section>
        </div>
      )}
      {profileImage && (
        <div className="contact-picker-backdrop" role="presentation">
          <section className="contact-picker photo-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-crop-title">
            <header className="contact-picker-header">
              <div><p className="chat-overline">PROFILE PHOTO</p><h2 id="photo-crop-title">Adjust your picture</h2><p>Move and zoom the image to choose what appears in your avatar.</p></div>
              <IconButton className="contact-picker-close" aria-label="Cancel photo adjustment" onClick={() => { setProfileImage(null); setProfileImageError(""); }}><CloseRounded /></IconButton>
            </header>
            <div className="photo-crop-preview" style={{ width: cropFrameSize, height: cropFrameSize }}>
              {profileImagePreview && <img src={profileImagePreview} alt="Profile photo crop preview" onLoad={(event) => setProfileImageDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} style={{ width: cropPreviewWidth, height: cropPreviewHeight, left: cropPreviewLeft, top: cropPreviewTop }} />}
            </div>
            <label className="photo-crop-control">Zoom <span>{profileZoom.toFixed(1)}×</span><input type="range" min="1" max="3" step="0.05" value={profileZoom} onChange={(event) => setProfileZoom(Number(event.target.value))} /></label>
            <label className="photo-crop-control">Horizontal position<input type="range" min="-100" max="100" value={profileCropX} onChange={(event) => setProfileCropX(Number(event.target.value))} disabled={cropPreviewWidth <= cropFrameSize} /></label>
            <label className="photo-crop-control">Vertical position<input type="range" min="-100" max="100" value={profileCropY} onChange={(event) => setProfileCropY(Number(event.target.value))} disabled={cropPreviewHeight <= cropFrameSize} /></label>
            {profileImageError && <p className="friend-action-error" role="alert">{profileImageError}</p>}
            <div className="photo-crop-actions">
              <button type="button" className="photo-crop-cancel" onClick={() => { setProfileImage(null); setProfileImageError(""); }} disabled={savingProfileImage}>Cancel</button>
              <button type="button" className="photo-crop-save" onClick={saveCroppedProfileImage} disabled={savingProfileImage || !profileImageDimensions}>{savingProfileImage ? "Saving…" : "Save profile picture"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default ChatHome;
