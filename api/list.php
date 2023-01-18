<?php



switch ($_GET["type"]) {
    case 'sound':
        $extensions = ['mp3', 'ogg'];
        $working_dir = __DIR__ . "/../media/sound/";
    break;
    case 'image':
        $extensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
        $working_dir = __DIR__ . "/../media/image/";
    break;
    case 'json':
        $extensions = ['json'];
        $working_dir = __DIR__ . "/../media/json/";
    break;
}

$dir = scandir($working_dir);

$result = [];
foreach ($dir as $filename) {
    $pathinfo = pathinfo($filename);
    if (in_array($pathinfo['extension'], $extensions)) {
        $result[] = $filename;
    }
}
echo json_encode($result);