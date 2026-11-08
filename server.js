'use strict';
// The legacy runtime is preserved in Git at aee38ba. It is never imported here.
const {createStudio}=require('./src/http');
async function main(){
  const studio=createStudio();
  try {
    const address=await studio.listen();
    console.log(`Văn Phòng AI Studio v4: http://127.0.0.1:${address.port}`);
    console.log('Đăng nhập bằng khóa local tại thư mục dữ liệu: access-token (CEO), read-token (chỉ đọc).');
    console.log('Mặc định: .studio/access-token. Không chia sẻ hoặc commit khóa.');
    let stopping=false;
    const stop=async()=>{if(stopping)return;stopping=true;await studio.close();};
    process.on('SIGTERM',stop);process.on('SIGINT',stop);
  } catch(error) {await studio.close();throw error;}
}
if(require.main===module)main().catch(error=>{console.error('Studio không khởi động:',error.message);process.exitCode=1;});
module.exports={createStudio};
