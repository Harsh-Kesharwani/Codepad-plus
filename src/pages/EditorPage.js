import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';
import './EditorPage.css'

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [ stream, setStream ] = useState();
    const myVideo = useRef();

    // useEffect(()=>{
    //     navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
	// 		setStream(stream)
	// 		myVideo.current.srcObject = stream
    //         console.log(stream);
	// 	})
    // },[]);

    document.getElementById("c").hidden = true;

    useEffect(() => {
        const resizer = document.querySelector("#resizer");
        const sidebar = document.querySelector("#sidebar");

        resizer.addEventListener("mousedown", (event) => {
            document.addEventListener("mousemove", resize, false);
            document.addEventListener("mouseup", () => {
                document.removeEventListener("mousemove", resize, false);
            }, false);
        });

        function resize(e) {
            const size = `${e.x}px`;
            sidebar.style.flexBasis = size;
        }

        sidebar.style.flexBasis = '220px';
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
                // stream: stream
            });

            // Listening for joined event
            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                        console.log(`${username} joined`);
                    }
                    setClients(clients);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });
                }
            );

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );
        };
        init();
        return () => {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
        };
    }, []);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div id="wrapper">
            <div id="container">
                <div id="sidebar">
                    <div className="asideInner">
                        <div className="logo">
                            <img
                                className="logoImage"
                                src="/code-sync.png"
                                alt="logo"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <h4>Connected</h4>
                        <div className="clientsList">
                            {clients.map((client) => (
                                <Client
                                    socketRef={socketRef}
                                    roomId={roomId}
                                    key={client.socketId}
                                    username={client.username}
                                />
                            ))}
                        </div>
                    </div>
                    <button type="button" onClick={copyRoomId} class="btn btn-light my-3">copy roomID</button>
                    <button type="button" onClick={leaveRoom} class="btn btn-danger">Leave</button>
                </div>
                <div id="resizer"></div>
                <div id="main">
                    <Editor
                        socketRef={socketRef}
                        roomId={roomId}
                        onCodeChange={(code) => {
                            codeRef.current = code;
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default EditorPage;
