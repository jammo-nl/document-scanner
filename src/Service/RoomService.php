<?php

namespace App\Service;

use Symfony\Component\Filesystem\Path;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\String\ByteString;
use Psr\Log\LoggerInterface;

// make sure our filenames are safe to use
function filter_filename($name)
{
    // remove illegal file system characters https://en.wikipedia.org/wiki/Filename#Reserved_characters_and_words
    $name = str_replace(array_merge(
        array_map('chr', range(0, 31)),
        array('<', '>', ':', '"', '/', '\\', '|', '?', '*')
    ), '', $name);
    // maximise filename length to 255 bytes http://serverfault.com/a/9548/44086
    $ext = pathinfo($name, PATHINFO_EXTENSION);
    $name = mb_strcut(pathinfo($name, PATHINFO_FILENAME), 0, 255 - ($ext ? strlen($ext) + 1 : 0), mb_detect_encoding($name)) . ($ext ? '.' . $ext : '');
    return $name;
}

class RoomService
{
    private $room_storage;
    private $logger;
    private $fs;

    public function __construct($room_storage, LoggerInterface $logger, FileSystem $fs)
    {
        $this->room_storage = $room_storage;
        $this->logger = $logger;
        $this->fs = $fs;
    }

    public function createRoom(array $msg): string
    {
        while (true) {
            $room = ByteString::fromRandom(16, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890._-')->toString();
            $path = Path::normalize($this->room_storage . '/' . filter_filename($room) . ".json");
            if (!file_exists($path))
                break;
        }

        $contents = json_encode([
            "host" => [],
            "client" => [$msg]
        ]);
        $this->fs->dumpFile($path, $contents);
        return $room;
    }

    public function setMessage(string $room, bool $host, $message)
    {
        $path = Path::normalize($this->room_storage . '/' . filter_filename($room) . ".json");
        // how to do proper error handling?....
        if (!file_exists($path))
            return;

        $contents = json_decode($this->fs->readFile($path), true);
        if ($host) {
            $contents['client'][] = $message;
        } else {
            $contents['host'][] = $message;
        }
        $this->fs->dumpFile($path, json_encode($contents));
    }

    public function getRoom(string $room): ?array
    {
        $path = Path::normalize($this->room_storage . '/' . filter_filename($room) . ".json");
        if (!file_exists($path))
            return null;

        $contents = json_decode($this->fs->readFile($path), true);
        $message = $contents['client'];
        $contents['client'] = [];
        $this->fs->dumpFile($path, json_encode($contents));
        return $message;
    }

    public function joinRoom(string $room, array $msg)
    {
        $path = Path::normalize($this->room_storage . '/' . filter_filename($room) . ".json");
        // how to do proper error handling?....
        if (!file_exists($path))
            return;

        $contents = json_decode($this->fs->readFile($path), true);
        $contents['host'] = [$msg];
        $this->fs->dumpFile($path, json_encode($contents));
    }

    public function deleteRoom(string $room)
    {
        $path = Path::normalize($this->room_storage . '/' . filter_filename($room) . ".json");
        // how to do proper error handling?....
        if (!file_exists($path))
            return;

        unlink($path);
    }

    public function getData(string $room, bool $host): ?array
    {
        $path = Path::normalize($this->room_storage . '/' . filter_filename($room) . ".json");
        // how to do proper error handling?....
        if (!file_exists($path))
            return null;

        // read the data for the client/host and reset the file
        $contents = json_decode($this->fs->readFile($path), true);
        if ($host) {
            $return = $contents['host'];
            $contents['host'] = [];
        } else {
            $return = $contents['client'];
            $contents['client'] = [];
        }
        $this->fs->dumpFile($path, json_encode($contents));

        if ($return)
            return $return;
        else
            return null;
    }

    public function roomGc(): void
    {
        // get all files
        $path = Path::normalize($this->room_storage . '/*');
        $files = glob($path);

        // setup our threashold
        $threshold = strtotime('-1 hour');

        // remove files that have a last modified time older than the threashold
        foreach ($files as $file) {
            if (is_file($file)) {
                if ($threshold >= filemtime($file)) {
                    unlink($file);
                }
            }
        }
    }
}
