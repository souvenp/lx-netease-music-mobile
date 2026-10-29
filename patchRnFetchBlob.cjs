const fs = require('node:fs');
const path = require('node:path');

// 将文件响应包装异常交还给 onFailure，不能退回普通响应后再强制转换。
const patchSource = source => {
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  let result = source.replace(/\r\n/g, '\n');
  if (result.includes('// LX: propagate file response errors')) return source;

  const interceptorStart = result.indexOf('            clientBuilder.addInterceptor(new Interceptor() {');
  const interceptorEnd = result.indexOf('\n            });', interceptorStart);
  if (interceptorStart < 0 || interceptorEnd < 0) throw new Error('RNFetchBlob interceptor not found');
  const interceptor = result.slice(interceptorStart, interceptorEnd);
  const guardedInterceptor = interceptor
    .replace('                    try {\n                        Response originalResponse = chain.proceed(req);',
      '                    // LX: propagate file response errors\n                    Response originalResponse = chain.proceed(req);\n                    try {')
    .replace(/                    catch\(SocketException e\) \{[\s\S]*?                    return chain\.proceed\(chain\.request\(\)\);/,
      `                    catch (Exception ex) {
                        // 文件不可写等异常必须拒绝请求，并释放原始响应。
                        originalResponse.close();
                        throw new IOException("RNFetchBlob response storage failed: " + ex.getMessage(), ex);
                    }`);
  if (guardedInterceptor === interceptor || guardedInterceptor.includes('return chain.proceed(chain.request());')) {
    throw new Error('RNFetchBlob interceptor differs from expected source');
  }
  result = result.slice(0, interceptorStart) + guardedInterceptor + result.slice(interceptorEnd);

  const bodyDeclaration = '                ResponseBody responseBody = resp.body();';
  if (!result.includes(bodyDeclaration)) throw new Error('RNFetchBlob file response body not found');
  result = result.replace(bodyDeclaration, `${bodyDeclaration}
                // 检查响应类型，异常时返回 JS 错误，避免原生 ClassCastException。
                if (!(responseBody instanceof RNFetchBlobFileResp)) {
                    if (responseBody != null) responseBody.close();
                    releaseTaskResource();
                    callback.invoke("RNFetchBlob expected a file response. Check storage access.", null);
                    return;
                }`);
  return result.replace(/\n/g, newline);
};

module.exports = { patchSource };

if (require.main === module) {
  const file = path.join(__dirname, 'node_modules/rn-fetch-blob/android/src/main/java/com/RNFetchBlob/RNFetchBlobReq.java');
  const source = fs.readFileSync(file, 'utf8');
  const patched = patchSource(source);
  if (patched !== source) fs.writeFileSync(file, patched, 'utf8');
  console.log('RNFetchBlob file response safety patch ready.');
}
