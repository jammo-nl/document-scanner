<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\JsonResponse;

use App\Service\RoomService;

class MainController extends AbstractController
{
    #[Route('/', name: 'app_main', methods: ['GET'])]
    public function index(RoomService $room_service): Response
    {
        return $this->render('index.html.twig', [
            'version' => $room_service->version
        ]);
    }

    #[Route('/scanner/{room}', name: 'app_scanner', methods: ['GET'])]
    public function scanner(string $room): Response
    {
        return $this->render('scanner.html.twig', [
            'room' => $room,
        ]);
    }

    // Keep this as fast as possible, this function is getting called a lot of times
    // due to the lack of websocket support on shared hosting.
    #[Route('/signalling', name: 'signalling', methods: ['POST'])]
    public function signalling(Request $request, RoomService $room_service): JsonResponse
    {
        $data = $request->toArray();
        $is_host = $data['is_host'];
        $room = $data['room'];
        if (!isset($data['data'])) {
            $data = $room_service->getData($room, $is_host);
            return $this->json($data);
        }
        $message = $data['data'];

        switch ($message['type']) {
                // createroom is a special call that returns a message with the created room
                // all other calls return an empty message or the requested content if it is available
            case "CreateRoom":
                if (!$is_host) {
                    $message['type'] = 'Error';
                    $message['payload'] = 'CreateRoom is only available for hosts!';
                    break;
                }
                // Store the message on the client, and return the CreateRoom message
                // with the room as payload
                $room = $room_service->createRoom($message);
                $message['payload'] = $room;
                return $this->json([$message]);
                break;
            case "Disconnect":
                $room_service->deleteRoom($room);
                break;
            default:
                $room_service->setMessage($room, $is_host, $message);
                break;
        }

        return $this->json([$message]);
    }
}
