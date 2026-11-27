// Append-only: the original 30 prompts remain in runtime.js so historical
// question_text values continue to match exactly. Every line here is a prompt.
const extraDailyQuestions = `
¿Qué gesto de esta mañana te gustaría que repitiéramos?
¿Qué me contarías si tuviéramos una hora sin interrupciones?
¿Qué te gustaría que comprendiera mejor de tu forma de pensar?
¿Qué palabra describe cómo te sientes a mi lado esta semana?
¿Cuándo te resulta más fácil abrir tu corazón conmigo?
¿Cómo te gustaría recibir consuelo cuando te equivocas?
¿Qué tema te gustaría conversar sin prisas?
¿Qué expresión mía te hace sentir escuchado/a?
¿Qué podemos hacer para no dar por sentado el amor del otro?
¿Qué tipo de tranquilidad te gustaría que construyéramos?
¿Qué te ayuda a decir lo que realmente necesitas?
¿Qué conversación reciente te dejó una enseñanza?
¿Qué quieres que recuerde cuando no puedas expresarte bien?
¿Qué pregunta te gustaría que te hiciera más a menudo?
¿Qué pequeña mejora haría más bonitas nuestras mañanas?
¿Qué te gustaría compartir al terminar cada jornada?
¿Qué señal te ayuda a saber que estoy prestando atención?
¿Qué emoción te gustaría aprender a expresar mejor conmigo?
¿Qué podemos hacer cuando necesitamos un momento a solas?
¿Qué significa para ti sentirse acompañado sin hablar?
¿Cómo podemos celebrar los días comunes?
¿Qué te gusta descubrir de mí cuando conversamos?
¿Qué diferencia entre nosotros has aprendido a valorar?
¿Qué te gustaría que hiciéramos cuando tengamos opiniones distintas?
¿Qué frase de ánimo te ayuda en los momentos de incertidumbre?
¿Qué te hace sentir en libertad para ser tú mismo/a?
¿Cómo podemos pedirnos ayuda con más facilidad?
¿Qué hábito de escucha te gustaría practicar esta semana?
¿Qué límite personal te gustaría que respetáramos mejor?
¿Qué te gustaría que recordara sobre tus días difíciles?
¿Qué foto elegirías para representar este mes?
¿Cuál fue una de nuestras risas más inesperadas?
¿Qué detalle recuerdas del primer día que hablamos?
¿Qué lugar cotidiano se volvió especial desde que estamos juntos?
¿Qué comida te recuerda una salida que disfrutamos?
¿Qué mensaje mío guardas con cariño en tu memoria?
¿Qué momento nuestro te gustaría dibujar?
¿Qué paseo sencillo volverías a hacer exactamente igual?
¿Qué sorpresa de nuestra historia recuerdas con gratitud?
¿Qué pequeña victoria compartida nunca quieres olvidar?
¿Qué olor te transporta a un recuerdo conmigo?
¿Qué escena de nuestra historia parece sacada de una película?
¿Qué anécdota contarías para explicar cómo nos conocimos?
¿Qué aprendimos de una cita que no salió como esperábamos?
¿Qué regalo recibido tiene un significado especial para ti?
¿Qué día te descubriste pensando que querías construir algo conmigo?
¿Qué recuerdo te gustaría revivir en nuestro próximo aniversario?
¿Qué foto te gustaría imprimir para nuestro futuro hogar?
¿Qué momento compartido te hizo sentir orgulloso/a de nosotros?
¿Qué canción describiría un capítulo concreto de nuestro noviazgo?
¿Qué lugar cercano podríamos explorar un domingo?
¿Qué desayuno te gustaría preparar juntos?
¿Qué juego de mesa escogerías para una noche tranquila?
¿Qué película escogerías para una cita temática?
¿Qué actividad artística probarías aunque nunca la hayas hecho?
¿Qué paisaje te gustaría contemplar al amanecer conmigo?
¿Qué paseo en naturaleza te gustaría planear?
¿Qué destino colombiano te da curiosidad conocer juntos?
¿Qué pequeña aventura podríamos vivir sin salir de la ciudad?
¿Qué receta familiar te gustaría enseñarme?
¿Qué actividad de nuestra infancia podríamos recuperar?
¿Qué deporte disfrutarías aprender juntos por diversión?
¿Qué museo o exposición te gustaría visitar?
¿Qué rincón de nuestra ciudad aún te falta descubrir?
¿Qué tipo de café o merienda elegirías para una cita?
¿Qué lugar elegirías para contemplar las estrellas?
¿Qué destino elegirías para un viaje improvisado de un día?
¿Qué paisaje te gustaría fotografiar juntos?
¿Qué libro podríamos leer y comentar capítulo a capítulo?
¿Qué habilidad creativa te gustaría enseñarme?
¿Qué experiencia cultural te gustaría vivir conmigo?
¿Qué plan harías en una tarde lluviosa?
¿Cómo sería una escapada perfecta a una cabaña?
¿Qué destino frío te gustaría explorar de la mano?
¿Qué actividad elegirías para desconectarnos del celular?
¿Qué comida nueva te animarías a probar conmigo?
¿Qué paseo al aire libre harías al acabar una semana pesada?
¿Qué desafío culinario divertido podríamos inventar?
¿Qué lugar elegirías para nuestro próximo pícnic?
¿Qué experiencia local te gustaría regalarle al otro?
¿Qué cualidad mía te inspira a ser mejor?
¿Qué esfuerzo cotidiano mío te gustaría reconocer?
¿Qué has aprendido al recibir cariño de una forma diferente a la tuya?
¿Qué gesto de amabilidad ajeno te inspiró últimamente?
¿Qué logro personal quieres que celebremos más?
¿Qué aspecto de nuestra relación te hace sentir esperanza?
¿Qué te hace admirar la manera en que resolvemos problemas?
¿Qué pequeño sacrificio del otro te gustaría agradecer?
¿Qué valor de tu familia quisieras conservar en nuestra relación?
¿Qué fortaleza tuya reconoces gracias a nuestro noviazgo?
¿En qué ocasión sentiste que te apoyé sin juzgarte?
¿Qué te gustaría agradecer antes de dormir hoy?
¿Qué lección de humildad te ha dejado compartir la vida conmigo?
¿Qué actitud de tu pareja te inspira confianza?
¿Qué esfuerzo de esta semana merece un abrazo y una felicitación?
¿Qué cualidad quisieras que nunca dejara de valorar en ti?
¿Qué oportunidad de servir a otros te gustaría compartir?
¿Qué cambio personal te alegra haber logrado durante nuestra relación?
¿Qué parte de tu historia te gustaría que honrara más?
¿Qué palabra de gratitud me regalarías hoy?
¿Qué oración te gustaría hacer juntos esta noche?
¿Qué pasaje bíblico te ha acompañado en una decisión importante?
¿Qué enseñanza de Jesús quisieras practicar en nuestra relación?
¿Qué motivo de gratitud a Dios tienes hoy?
¿Cómo podemos animarnos mutuamente a perseverar en la fe?
¿Qué hábito espiritual disfrutarías empezar a mi lado?
¿Qué significa para ti poner a Dios en el centro de nuestra relación?
¿Qué enseñanza sobre el perdón te gustaría aplicar mejor?
¿Cómo podemos apoyarnos cuando nuestra fe atraviesa dudas?
¿Qué momento de oración compartida recuerdas con cariño?
¿Qué ejemplo bíblico de servicio te inspira?
¿Qué fruto del Espíritu deseas cultivar más en ti?
¿Cómo podemos servir a nuestra comunidad juntos?
¿Qué canción de adoración te llena de paz?
¿Qué sueño quisieras encomendar especialmente a Dios?
¿Qué enseñanza sobre la paciencia necesitas recordar esta semana?
¿Qué significa para ti amar con bondad en tiempos de cansancio?
¿Qué te gustaría aprender sobre la Biblia conmigo?
¿Cómo podemos acompañarnos sin imponer nuestra manera de vivir la fe?
¿Qué experiencia de gratitud podríamos registrar en Nuestro calendario?
¿Qué te imaginas al pensar en nuestro hogar dentro de cinco años?
¿Qué rincón de nuestra futura casa quisieras decorar primero?
¿Qué rutina familiar te gustaría tener los sábados?
¿Qué aprenderías ahora para cuidar mejor de nuestro futuro hogar?
¿Qué conversación sobre el matrimonio te gustaría tener con calma?
¿Qué valor debería guiarnos al tomar decisiones importantes?
¿Qué te gustaría preservar de nuestro noviazgo después de casarnos?
¿Qué momento de una boda te emociona imaginar?
¿Qué tipo de celebración matrimonial refleja mejor lo que somos?
¿Qué recuerdo te gustaría guardar del día de nuestra boda?
¿Qué paisaje imaginas para nuestra luna de miel?
¿Qué responsabilidad doméstica disfrutas más?
¿Qué tarea del hogar podríamos aprender a repartir con justicia?
¿Qué costumbre familiar te gustaría conversar antes de convivir?
¿Qué significa para ti una promesa cumplida?
¿Qué habilidad financiera te gustaría desarrollar juntos?
¿Qué prioridad elegirías si tuviéramos que simplificar nuestros planes futuros?
¿Qué detalle haría de nuestra vivienda un lugar acogedor?
¿Qué te gustaría que nuestros invitados sintieran al visitarnos?
¿Cómo imaginas que seguiríamos teniendo citas al estar casados?
¿Qué meta de formación personal quieres alcanzar este año?
¿Qué proyecto creativo te gustaría terminar y compartir conmigo?
¿Qué habilidad profesional te gustaría desarrollar en el futuro?
¿Qué sueño de infancia sigue teniendo un lugar en tu corazón?
¿Cómo te puedo acompañar sin decidir por ti en tus metas?
¿Qué logro te gustaría celebrar en seis meses?
¿Qué pequeño paso podrías dar esta semana hacia una meta importante?
¿Qué miedo te gustaría afrontar poco a poco?
¿Qué te hace sentir capaz cuando dudas de ti?
¿Qué rutina de estudio o aprendizaje te gustaría mejorar?
¿Qué talento tuyo quisieras explorar con más libertad?
¿Qué logro de tu pareja te entusiasma imaginar?
¿Qué proyecto compartido te gustaría organizar primero?
¿Qué tiempo personal necesitas reservar para tus intereses?
¿Qué actividad te ayuda a recuperar energía después del trabajo?
¿Qué te gustaría aprender acerca de administrar tu tiempo?
¿Qué hábito saludable te gustaría practicar conmigo?
¿Qué decisión reciente te ha hecho crecer?
¿Qué te gustaría que celebráramos aunque todavía no hayas alcanzado una meta?
¿Qué frase te gustaría leer cuando necesites motivación?
¿Qué tipo de música disfrutas mientras haces tareas?
¿Qué aroma elegirías para una tarde tranquila?
¿Qué color te transmite serenidad y por qué?
¿Cuál es tu bebida favorita para un clima frío?
¿Qué canción cantarías conmigo aunque no sepamos la letra?
¿Qué postre elegirías para compartir una porción?
¿Qué animal te gusta observar y qué te llama la atención de él?
¿Qué estación o clima disfrutas más en una escapada?
¿Qué regalo hecho a mano te gustaría recibir?
¿Qué género de libros te gustaría descubrir?
¿Qué objeto de tu infancia conservas con cariño?
¿Qué tipo de fotografía te gusta mirar más?
¿Qué vestido o estilo de ropa te hace sentir cómodo/a y feliz?
¿Qué paisaje elegirías como fondo de pantalla?
¿Qué plato te gustaría enseñarle a alguien que amas?
¿Qué personaje de una historia admiras y por qué?
¿Qué actividad te hace perder la noción del tiempo?
¿Qué recuerdo musical tienes de tu familia?
¿Qué canción elegirías para conducir por una carretera bonita?
¿Qué pequeña colección te gustaría comenzar?
¿Qué significa para ti compartir las responsabilidades sin llevar cuentas?
¿Cómo prefieres que resolvamos juntos un malentendido?
¿Qué te ayuda a disculparte con sinceridad?
¿Qué te gustaría que hiciéramos si una conversación se vuelve intensa?
¿Qué diferencia existe para ti entre aconsejar y escuchar?
¿Qué necesitas para sentir que una disculpa fue recibida?
¿Cómo podemos evitar interpretar las intenciones del otro sin preguntar?
¿Qué palabra podríamos utilizar para pedir una pausa con cariño?
¿Qué te ayuda a retomar una conversación después de calmarte?
¿Qué podemos aprender de nuestras distintas formas de organizar el día?
¿Qué acuerdo nos ayudaría a cuidar los tiempos de descanso?
¿Qué te gustaría que hiciéramos cuando cambien nuestros planes a última hora?
¿Qué nos ayuda a tomar decisiones cuando ambos tenemos preferencias distintas?
¿Cómo te gustaría que reconociéramos nuestros propios errores?
¿Qué hábito fortalecería nuestra confianza en la distancia?
¿Qué significa para ti acompañarnos sin controlar al otro?
¿Qué te ayuda a comunicar una preocupación sin temor?
¿Cómo podemos evitar que el cansancio afecte nuestra manera de hablarnos?
¿Qué señal te indica que conviene hablar de un tema en otro momento?
¿Qué te gustaría que recordáramos al reconciliarnos?
¿Qué objeto elegirías para una cápsula del tiempo de este año?
¿Qué mensaje le escribirías a nuestra versión de dentro de diez años?
¿Qué título tendría un libro sobre nuestra historia hasta hoy?
¿Qué tres imágenes pondrías en un álbum de este año?
¿Qué te gustaría escuchar de nosotros cuando seamos mayores?
¿Qué enseñanza quisieras transmitir a una generación futura?
¿Qué tradición de aniversario te gustaría que durara muchos años?
¿Qué lugar de nuestra historia quisieras volver a visitar de mayores?
¿Qué sueño te gustaría recordar aunque cambien nuestros planes?
¿Qué le preguntarías a nuestra versión de recién casados?
¿Qué recuerdo de este año guardarías en una caja especial?
¿Qué costumbre te gustaría que tuviera nombre propio entre nosotros?
¿Qué frase pondrías al comienzo de nuestro álbum?
¿Qué fotografía futura te emociona imaginar?
¿Qué celebración sencilla te gustaría tener cada año?
¿Qué te gustaría que nuestras cartas nos recordaran en días difíciles?
¿Qué capítulo de nuestra relación merece un nombre especial?
¿Qué consejo amable darías a nuestra versión del inicio del noviazgo?
¿Qué experiencia te gustaría contar algún día como una aventura inolvidable?
¿Qué quieres que nunca olvidemos de esta etapa de nuestra vida?
¿Qué pequeño gesto de cariño prefieres al despertar?
¿Qué mensaje te gustaría recibir antes de una jornada importante?
¿Qué muestra de afecto te hace sentir cuidado/a cuando estás cansado/a?
¿Qué tipo de compañía disfrutas cuando estás haciendo algo tranquilo?
¿Qué detalle te gustaría sorprenderme preparando sin motivo especial?
¿Qué manera de celebrar un cumpleaños te hace más ilusión?
¿Qué gesto sencillo te ayuda a sentir cercanía cuando estamos lejos?
¿Qué te gusta de compartir silencios conmigo?
¿Qué tipo de cumplido te llega especialmente al corazón?
¿Qué ayuda cotidiana valoras aunque no suelas pedirla?
¿Qué te gustaría que hiciéramos para despedirnos al final de una cita?
¿Qué actividad te hace sentir que el tiempo juntos fue bien aprovechado?
¿Qué regalo simbólico representaría nuestro amor?
¿Qué momento de nuestra rutina merece más atención?
¿Qué pequeña sorpresa te gustaría encontrar en un día normal?
¿Qué detalle te gustaría que tuviéramos cuando uno está enfermo?
¿Qué te hace disfrutar una conversación después de un día ocupado?
¿Qué gesto de ternura te gustaría pedir con confianza?
¿Qué palabra bonita te gustaría que usáramos para animarnos?
¿Cómo podemos cuidar la alegría de encontrarnos todos los días?
¿Qué te gustaría que hiciéramos al terminar una semana intensa?
¿Qué ritual breve nos ayudaría a empezar el mes con ilusión?
¿Qué plan elegirías para una mañana libre?
¿Qué hábito de descanso te gustaría proteger los domingos?
¿Qué cita podríamos programar sin depender del clima?
¿Qué actividad elegirías para compartir con nuestras familias?
¿Qué fiesta o tradición local te gustaría disfrutar conmigo?
¿Qué tarea nos vendría bien hacer juntos escuchando música?
¿Qué momento de la semana quieres reservar para conversar?
¿Qué pequeña acción podría facilitarle la semana al otro?
¿Qué plan alternativo podríamos disfrutar si cancelan una salida?
¿Qué cita te gustaría organizar para agradecer una semana de trabajo?
¿Qué actividad podríamos realizar con un presupuesto pequeño?
¿Qué comida casera elegirías para una noche sin compromisos?
¿Qué paseo corto podríamos convertir en costumbre?
¿Qué día te gustaría reservar para preparar nuestros planes?
¿Qué decisión pendiente te gustaría que revisáramos sin presión?
¿Qué proyecto podríamos dividir en pasos más sencillos?
¿Qué compromiso nos ayudaría a cuidar nuestro tiempo juntos?
¿Qué actividad te gustaría incluir en el calendario el próximo mes?
¿Qué cualidad te gustaría cultivar para ser una mejor pareja?
¿Qué has aprendido de tus propias necesidades emocionales?
¿Qué hábito te ayuda a sentirte más presente?
¿Qué aspecto de tu personalidad te gustaría conocer mejor?
¿Qué te gustaría perdonarte a ti mismo/a?
¿Qué te hace sentir que estás avanzando aunque sea despacio?
¿Qué consejo te das cuando tienes que tomar una decisión difícil?
¿Qué característica tuya te gustaría apreciar más?
¿Qué te ayuda a recuperar la calma tras una jornada complicada?
¿Qué aprendizaje te dejó un error reciente?
¿Qué significa para ti descansar sin culpa?
¿Qué espacio personal te ayuda a renovar tu energía?
¿Qué te gustaría practicar para expresar tus límites con cariño?
¿Qué logro pequeño te cuesta reconocer en ti?
¿Qué valor guía tu manera de relacionarte con otras personas?
¿Qué pensamiento positivo te gustaría recordar al despertar?
¿Qué disfrutas hacer sin tener que demostrar nada a nadie?
¿Qué te gustaría aprender a pedir sin sentir vergüenza?
¿Qué forma de cuidar tu bienestar quieres priorizar?
¿Qué apoyo de tu pareja te ayuda a mantener tu independencia?
¿Qué acto de generosidad podríamos hacer en familia?
¿Qué tradición de tu hogar de infancia te daba alegría?
¿Qué te gustaría aprender de nuestras familias?
¿Qué tipo de encuentro familiar disfrutas más?
¿Qué valor quisieras demostrar con nuestras decisiones cotidianas?
¿Qué recuerdo de tu infancia te gustaría compartir conmigo?
¿Qué persona te enseñó una lección importante sobre el amor?
¿Qué costumbre familiar te gustaría adaptar a nuestra vida?
¿Qué conversación sobre nuestros orígenes quisieras tener?
¿Qué enseñanza recibida de tus padres te gustaría conservar?
¿Qué gesto de hospitalidad te gustaría ofrecer a quienes nos visiten?
¿Qué te ayuda a mantener buenas relaciones con quienes queremos?
¿Qué celebración te gustaría compartir con ambas familias?
¿Qué límite sano nos ayudaría a proteger nuestra intimidad como pareja?
¿Qué te gustaría que nuestros seres queridos vieran en nuestra relación?
¿Qué ejemplo de solidaridad conoces y admiras?
¿Qué forma de agradecer a nuestras familias te gustaría practicar?
¿Qué responsabilidad familiar te gustaría conversar conmigo?
¿Qué experiencia comunitaria podríamos disfrutar juntos?
¿Qué te gustaría aprender de otra generación?
¿Qué paisaje te hace sentir más cerca de la creación de Dios?
¿Qué canción elegirías para dedicarme en una carta?
¿Qué historia te gustaría inventar conmigo una noche?
¿Qué fotografía divertida podríamos recrear?
¿Qué recuerdo te gustaría convertir en una pintura?
¿Qué decoración elegirías para una cita en casa?
¿Qué objeto cotidiano te recuerda una broma nuestra?
¿Qué apodo cariñoso te hace sonreír?
¿Qué talento oculto te gustaría mostrarme algún día?
¿Qué desafío creativo de diez minutos podríamos hacer juntos?
¿Qué momento te gustaría celebrar con una carta escrita a mano?
¿Qué estilo de música te gustaría que aprendiéramos a bailar?
¿Qué juego inventarías para un viaje largo?
¿Qué título pondrías a nuestra próxima aventura?
¿Qué palabra inventarías para describir nuestra forma de reír?
¿Qué recuerdo elegirías para un collage de este mes?
¿Qué hecho curioso te gustaría investigar conmigo?
¿Qué pequeño proyecto de manualidades podría ocupar una tarde?
¿Qué fotografía nos faltaría tomar para completar nuestro álbum?
¿Qué desafío amistoso te gustaría proponerme sin competir en serio?
¿Qué te gustaría que hiciéramos antes de acabar este mes para acercarnos más?
¿Qué parte de nuestra relación merece una celebración discreta?
¿Qué experiencia te gustaría que registráramos antes de olvidarla?
¿Qué hábito de gratitud podríamos incorporar a nuestras conversaciones?
¿Qué meta te gustaría revisar sin convertirla en una obligación?
¿Qué aspecto de nuestro calendario te ilusiona utilizar más?
¿Qué recuerdo de esta semana te gustaría guardar con una frase?
¿Qué lugar de nuestro mapa te gustaría volver a visitar pronto?
¿Qué pregunta nos ayudaría a cerrar el mes con cariño?
¿Qué te gustaría elegir para nuestra próxima cita sorpresa?
¿Qué enseñanza de esta etapa nos gustaría llevar al futuro?
¿Qué detalle te gustaría incluir en nuestra próxima celebración?
¿Qué plan pendiente te emociona retomar?
¿Qué forma de celebrar el esfuerzo del otro podríamos inventar?
¿Qué te gustaría que nuestra próxima conversación nos ayudara a entender?
`.trim().split(/\n+/);
