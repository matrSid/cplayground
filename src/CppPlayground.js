import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Maximize2 } from 'lucide-react';
import { motion } from 'framer-motion';

const CppPlayground = () => {
  const [code, setCode] = useState('#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}');
  const [output, setOutput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [wsStatus, setWsStatus] = useState('Connecting...');
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connectWebSocket = useCallback(() => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    websocketRef.current = new WebSocket('ws://localhost:8765');  // Update this URL if necessary

    websocketRef.current.onopen = () => {
      console.log('WebSocket connection established');
      setWsStatus('Connected');
      setOutput(prevOutput => prevOutput + 'WebSocket connected successfully.\n');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    websocketRef.current.onmessage = (event) => {
      console.log('Received message:', event.data);
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'compilation' || message.type === 'execution' || message.type === 'error') {
          setOutput(prevOutput => prevOutput + `${message.type.toUpperCase()}: ${message.data || 'No output'}\n`);
        }
        setIsCompiling(false);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        setOutput(prevOutput => prevOutput + `Error: Failed to parse server response - ${error.message}\n`);
        setIsCompiling(false);
      }
    };

    websocketRef.current.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      setWsStatus(`Disconnected (Code: ${event.code})`);
      setOutput(prevOutput => prevOutput + `WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}\n`);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);  // Try to reconnect after 3 seconds
    };

    websocketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsStatus('Error');
      setOutput(prevOutput => prevOutput + `WebSocket error: ${error.message || 'Unknown error'}\n`);
      setIsCompiling(false);
    };
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  const runCode = () => {
    setIsCompiling(true);
    setOutput('Compiling and running...\n');
    
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending code to server');
      websocketRef.current.send(JSON.stringify({ type: 'run', code }));
    } else {
      console.error('WebSocket not connected');
      setOutput('Error: WebSocket connection not available. Trying to reconnect...\n');
      setIsCompiling(false);
      connectWebSocket();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">C++ Playground</h1>
        <p className="text-sm">WebSocket Status: {wsStatus}</p>
      </header>
      <main className="flex-grow flex flex-col md:flex-row p-4 space-y-4 md:space-y-0 md:space-x-4">
        <motion.div
          className={`flex-1 bg-white rounded-lg shadow-lg overflow-hidden ${
            isFullscreen ? 'fixed inset-0 z-50' : ''
          }`}
          layout
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center p-2 bg-gray-200">
            <span className="font-semibold">Code Editor</span>
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded hover:bg-gray-300 transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              <Maximize2 size={20} />
            </button>
          </div>
          <textarea
            className="w-full h-64 md:h-96 p-4 font-mono text-sm resize-none focus:outline-none"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
            aria-label="C++ Code Editor"
          />
        </motion.div>
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex justify-between items-center p-2 bg-gray-200">
            <span className="font-semibold">Output</span>
            <button
              onClick={runCode}
              disabled={isCompiling || wsStatus !== 'Connected'}
              className={`${
                isCompiling || wsStatus !== 'Connected' ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
              } text-white px-4 py-2 rounded transition-colors flex items-center`}
              aria-label={isCompiling ? "Compiling..." : "Run code"}
            >
              <Play size={16} className="mr-2" />
              {isCompiling ? 'Running...' : 'Run'}
            </button>
          </div>
          <pre className="flex-grow p-4 font-mono text-sm bg-black text-green-400 overflow-auto">
            {output}
          </pre>
        </div>
      </main>
    </div>
  );
};

export default CppPlayground;