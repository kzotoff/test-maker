<?php

echo "----" . PHP_EOL;
print_r($_FILES);
echo "----" . PHP_EOL . PHP_EOL;

switch ($_POST['type']) {
    case "sound":
        $target_folder = __DIR__ . "/../media/sound/";
        break;
    case "image":
        $target_folder = __DIR__ . "/../media/images/";
        break;
}


mkdir($target_folder, 0777, true);

foreach ($_FILES['file']['error'] as $index => $err) {
    $new_name = $target_folder . $_FILES['file']['name'][$index];
    $tmp_name = $_FILES['file']['tmp_name'][$index];
    echo $tmp_name . '-> ' . $new_name . PHP_EOL;
    if ($err == UPLOAD_ERR_OK) {
        move_uploaded_file($tmp_name, $new_name);
        echo 'ok' . PHP_EOL;
    } else {
        echo 'error code ' . $err . PHP_EOL;
    }
}
