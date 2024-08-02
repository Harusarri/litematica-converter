const express = require('express');
const multer = require('multer');
const nbt = require('prismarine-nbt');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const app = express();
const upload = multer({ dest: 'uploads/' });

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname)));

// HTML 파일 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/convert', upload.single('file'), async (req, res) => {
    const filePath = req.file.path;
    const targetVersion = parseInt(req.body.targetVersion, 10);

    try {
        // .litematic 파일 읽기
        const buffer = fs.readFileSync(filePath);
        const decompressed = zlib.gunzipSync(buffer);

        // NBT 데이터 파싱
        const data = await nbt.parse(decompressed);

        // NBT 데이터 구조 출력
        console.log(JSON.stringify(data.parsed, null, 2));

        // NBT 데이터 수정
        if (data.parsed.value) {
            const metadata = data.parsed.value;

            // MinecraftDataVersion 수정
            if (metadata.MinecraftDataVersion) {
                metadata.MinecraftDataVersion.value = targetVersion;
            } else {
                console.error('MinecraftDataVersion not found');
                res.status(500).send('MinecraftDataVersion not found');
                return;
            }

            // Version 필드 수정
            if (metadata.Version) {
                if (targetVersion >= 3463) { // 1.20 이상 버전
                    metadata.Version.value = 7;
                } else if (targetVersion >= 3218 && targetVersion < 3463) { // 1.19.3 이상 1.20 미만 버전
                    metadata.Version.value = 6;
                } else if (targetVersion <= 2586) { // 1.16.5 이하 버전
                    metadata.Version.value = 5;
                } else {
                    metadata.Version.value = 6; // 기본 값
                }
            } else {
                console.error('Version not found');
                res.status(500).send('Version not found');
                return;
            }
        } else {
            console.error('Metadata not found or has unexpected structure');
            res.status(500).send('Metadata not found or has unexpected structure');
            return;
        }

        // 수정된 NBT 데이터를 압축하여 파일로 저장
        const outputBuffer = zlib.gzipSync(nbt.writeUncompressed(data.parsed));
        const outputFilePath = path.join('uploads', `converted_${req.file.originalname}`);
        fs.writeFileSync(outputFilePath, outputBuffer);

        // 변환된 파일을 사용자에게 전송
        res.download(outputFilePath, (err) => {
            if (err) {
                console.error(err);
            }
            // 임시 파일 삭제
            fs.unlinkSync(filePath);
            fs.unlinkSync(outputFilePath);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('파일 변환 중 오류 발생');
    }
});

app.listen(3000, () => {
    console.log('서버가 3000번 포트에서 실행 중입니다.');
});
