pushd
cd ..\src
rm chrome\messagenotesplus.jar
Compress-Archive -Force .\chrome messagenotesplus
move .\messagenotesplus.zip .\chrome\messagenotesplus.jar

cd ..
Compress-Archive -Force .\src src1
rm distr\message_notes_plus-1.5.1.0.xpi -ErrorAction Ignore
move src1.zip distr\message_notes_plus-1.5.1.0.xpi
popd
