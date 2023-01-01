<?php

function clear_dir($target) {

    $dir = scandir($target);
    foreach ($dir as $filename) {
        echo $filename . PHP_EOL;;
        if (is_file($target . $filename)) {
            unlink($target . $filename);
        }
    }

}

clear_dir(__DIR__ . "/../media/sound/");
clear_dir(__DIR__ . "/../media/image/");
