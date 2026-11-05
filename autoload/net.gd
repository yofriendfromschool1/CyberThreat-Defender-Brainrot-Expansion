extends Node

const DEFAULT_PORT := 42421
const DISCOVERY_PORT := 42420
const MAGIC := "CTD1"
const ENet_MAX := 4095

signal lobby_found(info: Dictionary)
signal peer_joined(id: int)
signal peer_left(id: int)
signal connection_failed(reason: String)

var is_host: bool = false
var lobby_info: Dictionary = {}
var _host_socket: PacketPeerUDP = null
var _browser_socket: PacketPeerUDP = null
var _probe_timer: float = 0.0

func _ready() -> void:
	set_process(true)
	multiplayer.peer_connected.connect(func(id: int) -> void: peer_joined.emit(id))
	multiplayer.peer_disconnected.connect(func(id: int) -> void: peer_left.emit(id))
	multiplayer.connection_failed.connect(func() -> void: connection_failed.emit("connection_failed"))
	multiplayer.server_disconnected.connect(func() -> void: connection_failed.emit("server_disconnected"))

func host(port: int = DEFAULT_PORT, info: Dictionary = {}) -> Error:
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_server(port, ENet_MAX)
	if err != OK: return err
	multiplayer.multiplayer_peer = peer
	is_host = true; lobby_info = info.duplicate(true)
	_open_host_discovery()
	return OK

func join(ip: String, port: int = DEFAULT_PORT) -> Error:
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_client(ip, port)
	if err != OK: return err
	multiplayer.multiplayer_peer = peer
	is_host = false
	return OK

func disconnect_all() -> void:
	if _host_socket: _host_socket.close(); _host_socket = null
	stop_browse()
	if multiplayer.multiplayer_peer:
		multiplayer.multiplayer_peer.close(); multiplayer.multiplayer_peer = null
	is_host = false

func _open_host_discovery() -> void:
	_host_socket = PacketPeerUDP.new()
	_host_socket.set_broadcast_enabled(true)
	if _host_socket.bind(DISCOVERY_PORT) != OK:
		push_warning("LAN discovery unavailable: port %d busy" % DISCOVERY_PORT)
		_host_socket = null

func start_browse() -> void:
	stop_browse()
	_browser_socket = PacketPeerUDP.new()
	_browser_socket.set_broadcast_enabled(true)
	_browser_socket.bind(0)
	_probe_timer = 0.0

func stop_browse() -> void:
	if _browser_socket: _browser_socket.close(); _browser_socket = null

func _process(delta: float) -> void:
	if is_host and _host_socket:
		while _host_socket.get_available_packet_count() > 0:
			var data := _host_socket.get_packet().get_string_from_utf8()
			var from_ip := _host_socket.get_packet_ip()
			var from_port := _host_socket.get_packet_port()
			if data.begins_with(MAGIC + "?"):
				_host_socket.set_dest_address(from_ip, from_port)
				_host_socket.put_packet(("%s|%s" % [MAGIC, JSON.stringify(lobby_info)]).to_utf8_buffer())
	if _browser_socket:
		_probe_timer -= delta
		if _probe_timer <= 0.0:
			_probe_timer = 1.0
			_browser_socket.set_dest_address("255.255.255.255", DISCOVERY_PORT)
			_browser_socket.put_packet((MAGIC + "?").to_utf8_buffer())
		while _browser_socket.get_available_packet_count() > 0:
			var raw := _browser_socket.get_packet().get_string_from_utf8()
			var ip := _browser_socket.get_packet_ip()
			if not raw.begins_with(MAGIC + "|"): continue
			var parsed: Variant = JSON.parse_string(raw.substr(MAGIC.length() + 1))
			if typeof(parsed) == TYPE_DICTIONARY:
				var info: Dictionary = parsed
				info["ip"] = ip
				lobby_found.emit(info)
