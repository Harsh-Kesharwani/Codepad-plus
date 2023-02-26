/* eslint-disable no-undef */
import React, { useEffect, useState, useRef } from 'react';
import Avatar from 'react-avatar';

const Client = ({ username }) => {
    // const toggleAudio = () => {
    //     const audioTrack = stream.getAudioTracks()[0];
    //     audioTrack.enabled = !audioTrack.enabled;
    //   };
    //   const toggleVideo = () => {
    //     const videoTrack = stream.getVideoTracks()[0];
    //     videoTrack.enabled = !videoTrack.enabled;
    //   };
    return (
        <div className="client">
           <div><Avatar name={username} size={50} round="14px"/></div>
           {/* <div className="video">
				{stream && stream.getVideoTracks()[0].enabled && <video playsInline muted ref={stream} autoPlay style={{ width: "100%" }} />}
			</div> */}
            <div style={{display:'flex', gap:'2px'}}>
            <span className="userName">{username}</span>
            {/* { stream && <button onClick={toggleAudio}>audio</button> }
            { stream && <button onClick={toggleVideo}>Video</button> } */}
            </div>
        </div>
    );
};

export default Client;
