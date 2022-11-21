<?php

$type = "." . $_GET["type"];
$working_dir = __DIR__ . "/../media";

$dir = scandir($working_dir);

$result = [];
foreach ($dir as $filename) {
    if (substr($filename, -4) == $type) {
        $result[] = $filename;
    }
}
print_r(json_encode($result));