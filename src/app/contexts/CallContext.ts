import {
  createContext,
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import { ChatRoom } from "../types/ChatRoom";
import { ICECanddiate } from "../types/ICECandidate";
import { User } from "../types/User";

const CallContext = createContext<{
  currentCallingChatRoom: ChatRoom | undefined;
  setCurrentCallingChatroom: Dispatch<SetStateAction<ChatRoom | undefined>>;
  incomingCallChatRoom: ChatRoom | undefined;
  peerConnection: MutableRefObject<RTCPeerConnection | null>;
  subscriptionConnection: MutableRefObject<RTCPeerConnection | null>;
  callWorkPending: MutableRefObject<boolean>;
  handlePrepareStartOrJoinCall: (
    roomId: number,
    isStart: boolean
  ) => Promise<boolean>;
  localIceCandidates: MutableRefObject<ICECanddiate[]>;
  handleCloseStream: () => void;
  handleSubscribeStream: (chatRoom: ChatRoom, joinTime: number) => void;
  callErrorText: {
    status: string;
    error: string;
    musicStatus: string;
    musicDisplay: string;
    settingsStatus: string;
    micStatus: string;
  };
  setCallErrorText: Dispatch<
    SetStateAction<{
      status: string;
      error: string;
      musicStatus: string;
      musicDisplay: string;
      settingsStatus: string;
      micStatus: string;
    }>
  >;
  callDecorator: { [userId: number]: string };
  setCallDecorator: Dispatch<SetStateAction<{ [userId: number]: string }>>;
  localStream: MutableRefObject<MediaStream | null>;
  videoStreams: { [userId: number]: MediaStream };
  devices: {
    audioInputDevices: MediaDeviceInfo[];
    videoInputDevices: MediaDeviceInfo[];
  };
  selectedDevice: {
    audioUserInputDevice: string;
    videoUserInputDevice: string;
  };
  setSelectedDevice: Dispatch<
    SetStateAction<{
      audioUserInputDevice: string;
      videoUserInputDevice: string;
    }>
  >;
  handleChangeDevice: (deviceId: string, isVideo: boolean) => Promise<boolean>;
  handleEnableVideo: (
    enable: boolean,
    chatRoomId: number,
    noStreamYet?: boolean
  ) => Promise<boolean>;
  handleEndCall: (
    chatRoom: ChatRoom,
    currentUser: User,
    onIfCallEnded?: (callEnded: boolean) => void
  ) => Promise<void>;
  handleRejectIncomingCall: (
    chatRoom: ChatRoom,
    currentUser: User
  ) => Promise<void>;
  callOverlayRemoteController: string;
  setCallOverlayRemoteController: Dispatch<SetStateAction<string>>;
  callAlertOverlayRemoteController: string;
  setCallAlertOverlayRemoteController: Dispatch<SetStateAction<string>>;
  setIncomingCallChatRoom: Dispatch<SetStateAction<ChatRoom | undefined>>;
  handleEnableScreenShare: (
    enabled: "screenonly" | "withaudio" | "no",
    chatRoomId: number,
    config?: {
      width: number;
      height: number;
      fps: number;
      audio: boolean;
    }
  ) => Promise<boolean>;
  handleSetAudioStreamVolume: (
    userId: number,
    volume: number,
    system: boolean
  ) => boolean;
  handleSetEnableAudioStream: (
    userId: number,
    enable: boolean,
    system: boolean
  ) => boolean;
  disabledAudioStreams: Set<string>;
  handleSetEnableVideoStream: (
    userId: number,
    enable: boolean,
    screen: boolean
  ) => boolean;
  disabledVideoStreams: Set<string>;
  handleToggleMute: (muted: boolean) => void;
  handleToggleDeafen: (deafen: boolean) => void;
  handleStopMusic: () => void;
  synchronizeMusicEventQueue: MutableRefObject<
    { type: string; src: string; time: number; timestamp: number }[]
  >;
  selectedCallBackground: string;
  setSelectedCallBackground: Dispatch<SetStateAction<string>>;
  handlePreviewVideo: (
    currentUser: User,
    chatroom: ChatRoom,
    withEnablePrompt?: boolean,
    noStreamYet?: boolean
  ) => Promise<boolean>;
} | null>(null);

export default CallContext;
