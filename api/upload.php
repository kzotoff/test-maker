<?php

echo "----";
print_r($_FILES);
echo "----";

if ($_POST['type'] === "sound") {

    $target_folder = __DIR__ . "/../media/sound/";
    mkdir($target_folder, 0777, true);

    foreach ($_FILES['file']['error'] as $index => $err) {
        $new_name = $target_folder . $_FILES['file']['name'][$index];
        echo $new_name . PHP_EOL;
        if ($err == UPLOAD_ERR_OK) {
            $tmp_name = $_FILES['file']['tmp_name'][$index];
            move_uploaded_file($tmp_name, $new_name);
            echo "ok";
        }
    }
}