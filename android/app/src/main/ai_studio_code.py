import os
import argparse

# --- 配置 ---
# (无变化)
IGNORED_DIRS = {
    'node_modules', '.git', '.github', '.bundle',
    '.gradle', '.vscode', '.vs' ,'dist', 'build', '__pycache__',
    '.idea', '.vite', 'release'
}
IGNORED_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.ttf', '.woff',
    '.woff2', '.eot', '.lock', '.env', '.DS_Store', '.mp3', '.wav',
    '.ogg', '.zip', '.rar', '.gz', '.exe', '.dll', '.so', '.pkg',
    '.deb', '.dmg'
}

# --- 内容压缩函数 (简化) ---
def compress_content(content: str, mode: str) -> str:
    """
    根据指定的模式压缩文件内容以减少token。

    :param content: 原始文件内容。
    :param mode: 压缩模式 ('none' 或 'compressed')。
    :return: 压缩后的内容。
    """
    if mode == 'none':
        return content

    if mode == 'compressed':
        lines = content.splitlines()
        compressed_lines = []
        for line in lines:
            stripped_line = line.strip()
            # 过滤掉空行和大部分单行/块注释
            if stripped_line and not stripped_line.startswith(('#', '//', '/*', '*')):
                compressed_lines.append(stripped_line)
        # 用分号连接所有有效代码行，实现去除换行符
        return '; '.join(filter(None, compressed_lines))

    return content

# --- 脚本主体 (无变化) ---
def generate_project_context(root_path: str, output_file: str, compression_mode: str):
    """
    遍历指定路径下的所有文件和子目录，并将它们的名称和内容写入一个文本文件。
    """
    if not os.path.isdir(root_path):
        print(f"错误: 提供的路径 '{root_path}' 不是一个有效的目录。")
        return

    abs_root_path = os.path.abspath(root_path)

    level_text = '不压缩' if compression_mode == 'none' else '压缩 (极限模式)'

    print(f"开始扫描目录: {abs_root_path}")
    print(f"内容压缩级别: {level_text}")

    try:
        with open(output_file, 'w', encoding='utf-8', errors='ignore') as f:
            f.write(f"该路径名称: {os.path.basename(abs_root_path)}\n\n")

            for dirpath, dirnames, filenames in os.walk(abs_root_path, topdown=True):
                dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS]

                for filename in sorted(filenames):
                    if any(filename.endswith(ext) for ext in IGNORED_EXTENSIONS):
                        continue

                    file_path = os.path.join(dirpath, filename)
                    relative_path = os.path.relpath(file_path, abs_root_path)

                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as src_file:
                            content = src_file.read()

                        compressed_content = compress_content(content, compression_mode)

                        print(f"  正在处理: {relative_path}")
                        f.write(f"{'='*20}\n")
                        f.write(f"文件名: {relative_path.replace(os.sep, '/')}\n")
                        f.write(f"{'-'*20}\n")
                        f.write("下面是完整代码:\n\n")
                        f.write(compressed_content)
                        f.write("\n\n")

                    except Exception as e:
                        print(f"  无法读取文件: {relative_path}，原因: {e}")

        print(f"\n成功！所有文件内容已写入到: {os.path.abspath(output_file)}")

    except IOError as e:
        print(f"错误: 无法写入输出文件 '{output_file}'。请检查权限。原因: {e}")


if __name__ == "__main__":
    # --- 命令行参数解析 ---
    parser = argparse.ArgumentParser(
        description="将项目目录下所有文本文件的内容整合到一个txt文件中，用于AI上下文分析。",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("path", type=str, help="要扫描的项目根目录路径。")
    parser.add_argument("-o", "--output", type=str, default="project_context.txt", help="输出的txt文件名。")

    args = parser.parse_args()

    # --- 交互式选择 (简化版) ---
    compression_mode = ''
    while True:
        print("\n请选择:")
        print("  1: 不压缩 (保留原始格式)")
        print("  2: 压缩 (为JS/TS项目优化，去除注释、空行和换行符)")

        choice = input("请输入选项 (1 或 2) 后回车: ").strip()

        if choice == '1':
            compression_mode = 'none'
            break
        elif choice == '2':
            compression_mode = 'compressed'
            break
        else:
            print("\n输入无效，请输入 1 或 2。")

    # --- 执行主函数 ---
    generate_project_context(args.path, args.output, compression_mode)
