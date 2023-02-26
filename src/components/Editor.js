/* eslint-disable no-unused-expressions */
import React, { useEffect, useRef, useState } from 'react';
import Select from "react-select";
import monacoThemes from "monaco-themes/themes/themelist";
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';
import { languages } from './subcomponents/languages';
import axios from 'axios';
import toast from "react-hot-toast";
import btoa from 'btoa';
import OutputDetails from './subcomponents/outputDetails';
import OutputWindow from './subcomponents/outputWindow';
import 'bootstrap/dist/css/bootstrap.css';
import './Editor.css';

const javascriptDefault = ``;

const Editor = ({ socketRef, roomId, onCodeChange }) => {
  const editorRef = useRef(null);
  const [language, setLanguage] = useState({});
  const [code, setCode] = useState(javascriptDefault);
  const [customInput, setCustomInput] = useState('');
  const [processing, setProcessing] = useState(null);
  const [outputDetails, setOutputDetails] = useState(null);
  const [theme, setTheme] = useState({label: 'Dracula', value: 'dracula', key: 'dracula'});

  useEffect(() => {
    async function init() {
      editorRef.current = Codemirror.fromTextArea(
        document.getElementById('realtimeEditor'),
        {
          mode: { name: 'javascript', json: true },
          theme: `${theme.value}`,
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );
      editorRef.current.on('change', (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        onCodeChange(code);
        setCode(code) // added
        if (origin !== 'setValue') {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
        }
      });
    }
    init();
  }, []);

  useEffect(() => {
    const resizer1 = document.querySelector("#resizer1");
    const sidebar1 = document.querySelector("#sidebar1");

    resizer1.addEventListener("mousedown", (event) => {
      document.addEventListener("mousemove", resize, false);
      document.addEventListener("mouseup", () => {
        document.removeEventListener("mousemove", resize, false);
      }, false);
    });

    function resize(e) {
      const size = `${1848-e.x}px`;
      sidebar1.style.flexBasis = size;
    }

    sidebar1.style.flexBasis = '220px';

    if (socketRef.current) {
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null) {
          editorRef.current.setValue(code);
          setCode(code); // added
        }
      });
      socketRef.current.on(ACTIONS.SET_OUTPUT, ({ details })=>{
          setOutputDetails(()=>{return ({ ...details })});
      });
      
      socketRef.current.on(ACTIONS.SET_LANGUAGE,({ lang })=>{
          // console.log(typeof lang);
          // console.log('lang',lang);
          setLanguage(()=>{return ({...lang})});
          // console.log('lang',lang);
          // customOnSelectChange(lang);
      });
      socketRef.current.on(ACTIONS.CUSTOM_INPUT,({ input })=>{
          console.log(typeof (input));
          console.log('input',input);
          setCustomInput(input);
          console.log(input);
      })
    }

    return () => {
      socketRef.current.off(ACTIONS.CODE_CHANGE);
      socketRef.current.off(ACTIONS.SET_OUTPUT);
      socketRef.current.off(ACTIONS.SET_LANGUAGE);
      socketRef.current.off(ACTIONS.CUSTOM_INPUT);
    };
  }, [socketRef.current]);

  // useEffect(()=>{
  //   console.log('server',language);
  // },[language])

  // useEffect(()=>{
  //    console.log('custom Ip',customInput);
  // },[customInput])

  const onSelectChange = (sl) => {
    // console.log("selected Option...", sl);
    setLanguage(sl);
    socketRef.current.emit(ACTIONS.LANGUAGE,({roomId: roomId,language:sl}));
  };

  // function handleThemeChange(th) {
  //   console.log(th);
  // }

  const checkStatus = async (token) => {
    const options = {
      method: "GET",
      url: process.env.REACT_APP_RAPID_API_URL + "/" + token,
      params: { base64_encoded: "true", fields: "*" },
      headers: {
        "X-RapidAPI-Host": process.env.REACT_APP_RAPID_API_HOST,
        "X-RapidAPI-Key": process.env.REACT_APP_RAPID_API_KEY,
      },
    };
    try {
      let response = await axios.request(options);
      let statusId = response.data.status?.id;

      // Processed - we have a result
      if (statusId === 1 || statusId === 2) {
        // still processing
        setTimeout(() => {
          checkStatus(token)
        }, 2000)
        return
      } else {
        setProcessing(false)
        setOutputDetails(response.data)
        
        socketRef.current.emit(ACTIONS.OUTPUT,{roomId: roomId,details: response.data});
        
        toast.success(`Compiled Successfully!`)
        console.log('response.data', response.data)
        return
      }
    } catch (err) {
      console.log("err", err);
      setProcessing(false);
      toast.err("compilation fails");
    }
  };

  const handleCompile = () => {
    var c=0;
    if(!language.id){
      toast.error('Please Select Language');
      return ;
    }
    for(var i=0;i<code.length;i++){
      if(code[i]!==` ` && code[i]!=='\n'){
        break;
      }
      else{
        c++;
      }
    }
    if(c===code.length || code===``){
      toast.error('Please Enter Your Code');
      return ;
    }
    setProcessing(true);
    const formData = {
      language_id: language.id,
      // encode source code in base64
      source_code: btoa(code),
      stdin: btoa(customInput),
    };
    const options = {
      method: "POST",
      url: process.env.REACT_APP_RAPID_API_URL,
      params: { base64_encoded: "true", fields: "*" },
      headers: {
        "content-type": "application/json",
        "Content-Type": "application/json",
        "X-RapidAPI-Host": process.env.REACT_APP_RAPID_API_HOST,
        "X-RapidAPI-Key": process.env.REACT_APP_RAPID_API_KEY,
      },
      data: formData,
    };

    axios
      .request(options)
      .then(function (response) {
        console.log("res.data", response.data);
        const token = response.data.token;
        checkStatus(token);
      })
      .catch((err) => {
        let error = err.response ? err.response.data : err;
        setProcessing(false);
        console.log(error);
      });
  };
  function setinput(event){
    setCustomInput(event.target.value);
    socketRef.current.emit(ACTIONS.CUSTOM_INPUT,{roomId, input : event.target.value});
  }

  return (
    <div id="wrapper">
      <div id="container">
        <div id="main">
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <nav className="navbar border-bottom border-dark navbar-expand-lg bg-body-seconadry" style={{ display: 'grid' }}>
              <div class="container-fluid" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div class="collapse navbar-collapse border border-primary mx-5">
                  <Select
                    placeholder={`Select Language`}
                    options={languages}
                    // defaultValue={language.name}
                    value={languages.filter(function(mylang) {
                      return language.name === mylang.name;
                    })}
                    onChange={(selectedOption) => onSelectChange(selectedOption)}
                  />
                </div>
                {/* <div class="collapse navbar-collapse border border-primary mx-5">
                  <Select
                    placeholder={`Change Theme`}
                    options={Object.entries(monacoThemes).map(([themeId, themeName]) => ({
                      label: themeName,
                      value: themeId,
                      key: themeId,
                    }))}
                    onChange={handleThemeChange}
                  />
                </div> */}
                <div className='mx-5'>
                  <button type="button" onClick={handleCompile} className={processing ? "btn btn-success" : "btn btn-primary"}>{processing ? "Processing..." : "Compile and Execute"}</button>
                </div>
              </div>
            </nav>
            <div>
              <textarea id="realtimeEditor"></textarea>;
            </div>
          </div>
        </div>
        <div id="resizer1"></div>
        <div id="sidebar1">
          <div>
            <div className="right-container flex flex-shrink-0 w-[30%] flex-col">
              <div className='container'>
                <OutputWindow outputDetails={outputDetails}/> 
              </div> 
            </div>
              <div class="form-outline">
                <textarea class="form-control" onChange={setinput} id="textAreaExample" value={customInput} rows="4" placeholder='Enter input...' style={{height:'22vh'}}></textarea>
                <label class="form-label" for="textAreaExample">Custom Input</label>
              </div>
              <br></br>
              <div>
                  {outputDetails && <OutputDetails outputDetails={outputDetails} />}
              </div>
          </div>
        </div>
      </div>
    </div>
  )
};

export default Editor;
