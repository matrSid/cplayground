import asyncio
import websockets
import json
import subprocess
import os
import platform

print("server running")

async def compile_and_run_cpp(code):
    temp_cpp_file = "temp.cpp"
    
    # Check the operating system and adjust the binary name
    if platform.system() == "Windows":
        compiled_binary = "temp.exe"
        run_command = compiled_binary
    else:
        compiled_binary = "temp"
        run_command = f"./{compiled_binary}"

    with open(temp_cpp_file, "w") as f:
        f.write(code)

    if not os.path.exists(temp_cpp_file):
        return json.dumps({"type": "error", "data": "C++ source file not created!"})

    compile_process = await asyncio.create_subprocess_shell(
        f"g++ {temp_cpp_file} -o {compiled_binary}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await compile_process.communicate()

    if compile_process.returncode != 0:
        return json.dumps({"type": "error", "data": stderr.decode()})
    
    if not os.path.exists(compiled_binary):
        return json.dumps({"type": "error", "data": "Compiled binary not found after compilation!"})
    
    # Run the binary
    run_process = await asyncio.create_subprocess_shell(
        run_command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await run_process.communicate()

    result_output = stdout.decode() + stderr.decode()

    return json.dumps({
        "type": "execution",
        "data": result_output if result_output.strip() else "No output produced"
    })


async def handler(websocket, path):
    async for message in websocket:
        data = json.loads(message)
        if data['type'] == 'run':
            result = await compile_and_run_cpp(data['code'])
            await websocket.send(result)

start_server = websockets.serve(handler, "localhost", 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
