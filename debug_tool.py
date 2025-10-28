import asyncio
import http.server
import json
import socketserver
import subprocess
import threading
import webbrowser
import platform
import re
from datetime import datetime
import websockets

# --- 配置 ---
METRO_PORT = 8081
WEB_SERVER_PORT = 8088
DEBUG_WEBSOCKET_PORT = 8089

connected_clients = set()

def start_metro(project_path, loop):
    print(f"--- 正在您的项目路径下启动 Metro 服务器: {project_path} ---")
    command = ["npx", "react-native", "start", "--port", str(METRO_PORT)]
    use_shell = platform.system() == "Windows"

    try:
        process = subprocess.Popen(
            command, cwd=project_path, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, 
            text=True, encoding='utf-8', errors='ignore', bufsize=1, shell=use_shell,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if use_shell else 0
        )
    except Exception as e:
        print(f"\n\033[91m[ERROR] 启动 Metro 失败: {e}\033[0m")
        return None

    def forward_output():
        # 正则表达式，用于提取被特殊标记包裹的 JSON 字符串
        json_pattern = re.compile(r'###RN_DEBUG_START###(.*)###RN_DEBUG_END###')
        
        for line in iter(process.stdout.readline, ''):
            stripped_line = line.strip()
            if not stripped_line: continue

            match = json_pattern.search(stripped_line)
            
            # 如果匹配到我们定义的特殊日志格式
            if match:
                json_str = match.group(1)
                try:
                    # 验证它确实是 JSON
                    log_data = json.loads(json_str)
                    
                    # 封装成发送给前端的最终格式
                    log_payload = {
                        "type": "structured_log",
                        "timestamp": datetime.now().strftime('%H:%M:%S'),
                        "payload": log_data["payload"], # 直接使用 RN 发来的 payload
                        "logType": log_data.get("type", "log").upper() # 获取日志类型
                    }
                    
                    asyncio.run_coroutine_threadsafe(
                        broadcast_to_clients(json.dumps(log_payload)), loop
                    )

                except json.JSONDecodeError:
                    # 如果标记内的不是合法JSON，则忽略
                    pass

    threading.Thread(target=forward_output, daemon=True).start()
    return process


def start_web_server():
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=".", **kwargs)
    try:
        with socketserver.TCPServer(("", WEB_SERVER_PORT), Handler) as httpd:
            print(f"\n--- Web 服务器已在 http://localhost:{WEB_SERVER_PORT}/debugger.html 启动 ---")
            httpd.serve_forever()
    except Exception as e:
        print(f"\n\033[91m[ERROR] 启动 Web 服务器失败: {e}\033[0m")


async def broadcast_to_clients(message):
    if connected_clients:
        await asyncio.gather(*[client.send(message) for client in connected_clients])


async def websocket_handler(websocket, path):
    connected_clients.add(websocket)
    print("\n\033[94m--- 调试界面已连接。--- \033[0m")
    try:
        await websocket.send(json.dumps({
            "type": "status", "message": "连接成功！等待 App 日志..."
        }))
        await websocket.wait_closed()
    finally:
        connected_clients.remove(websocket)
        print("\033[93m--- 调试界面已断开。 ---\033[0m")


if __name__ == "__main__":
    project_path = input("请输入您的 React Native 项目根目录的绝对路径: ").strip()
    
    metro_process = None
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        metro_process = start_metro(project_path, loop)
        if metro_process is None: exit(1)

        web_server_thread = threading.Thread(target=start_web_server, daemon=True)
        web_server_thread.start()
        
        loop.call_later(1, webbrowser.open_new_tab, f'http://localhost:{WEB_SERVER_PORT}/debugger.html')

        start_server = websockets.serve(websocket_handler, "localhost", DEBUG_WEBSOCKET_PORT)
        
        print(f"--- WebSocket 调试服务器正在监听端口 {DEBUG_WEBSOCKET_PORT} ---")
        loop.run_until_complete(start_server)
        loop.run_forever()

    except KeyboardInterrupt:
        print("\n--- 正在关闭... ---")
    finally:
        if metro_process:
            if platform.system() == "Windows":
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(metro_process.pid)])
            else:
                metro_process.terminate()
        loop.close()
        print("--- 工具已退出。 ---")